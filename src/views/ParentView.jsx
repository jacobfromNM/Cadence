// src/views/ParentView.jsx
//
// Parent-facing screen. Requests geolocation and reports to staff when
// the parent is within NEARBY_METERS of the school.
// Tracks pickup status in real-time so parents see progress without refreshing.
// Parents can also add additional student codes (siblings) from this screen.

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { haversineMeters } from '../lib/haversine'
import { isWithinActiveHours } from '../lib/activeHours'

const NEARBY_METERS = 400
const STORAGE_KEY = 'cadence_parent_students'

function loadStoredIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveIds(ids) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch { }
}

// Determine what banner to show based on location + pickup state.
// pickups: { [studentId]: pickup_row }
function resolveBanner(geoStatus, pickups, studentIds, locationErr) {
  if (geoStatus === 'outsideHours') return { bg: 'var(--yellow-light)', border: 'var(--yellow)', icon: '🕐', color: 'oklch(0.45 0.13 80)', text: 'Outside active hours — your location is not being shared with the school.', bold: false }
  if (geoStatus === 'idle') return { bg: 'var(--surface)', border: 'var(--border)', icon: '📍', color: 'var(--text-2)', text: 'Allow location access to notify pickup staff when you arrive.', bold: false }
  if (geoStatus === 'locating') return { bg: 'var(--blue-light)', border: 'var(--blue)', icon: '📡', color: 'var(--blue)', text: "Watching your location - staff will be notified when you're nearby.", bold: false }
  if (geoStatus === 'error') return { bg: 'oklch(0.97 0.04 25)', border: 'var(--red)', icon: '⚠️', color: 'var(--red)', text: locationErr, bold: false }

  // geoStatus === 'nearby' — show pickup-based message
  const statuses = studentIds.map(id => pickups[id]?.status ?? null)
  const allComplete = statuses.length > 0 && statuses.every(s => s === 'complete')
  const anyActive = statuses.some(s => s === 'requested' || s === 'sent')

  if (allComplete) return { bg: 'var(--green-light)', border: 'var(--green)', icon: '✅', color: 'var(--green)', text: 'Picked up! Have a nice day!', bold: true }
  if (anyActive) return { bg: 'var(--yellow)', border: 'oklch(0.78 0.16 85)', icon: '🏃', color: 'oklch(0.38 0.12 80)', text: 'Getting your student ready for pickup…', bold: true }
  return { bg: 'var(--green-light)', border: 'var(--green)', icon: '✅', color: 'var(--green)', text: 'Staff have been notified - safely approachthe pickup zone.', bold: true }
}

function studentPickupLabel(pickup) {
  if (!pickup) return null
  if (pickup.status === 'complete') return { text: 'Picked up!', color: 'var(--green)' }
  if (pickup.status === 'sent') return { text: 'On the way out…', color: 'oklch(0.45 0.12 80)' }
  if (pickup.status === 'requested') return { text: 'Getting ready…', color: 'oklch(0.45 0.12 80)' }
  return null
}

export function ParentView({ school, initialStudentIds, onLogout }) {
  const [studentIds, setStudentIds] = useState(() => {
    const stored = loadStoredIds()
    const merged = [...new Set([...initialStudentIds, ...stored])]
    saveIds(merged)
    return merged
  })
  const [students, setStudents] = useState([])
  const [pickups, setPickups] = useState({})  // { [studentId]: pickup_row }
  const [geoStatus, setGeoStatus] = useState('idle')
  const [locationErr, setLocationErr] = useState('')
  const [absentIds, setAbsentIds] = useState(new Set())

  // Sibling add form
  const [siblingCode, setSiblingCode] = useState('')
  const [siblingErr, setSiblingErr] = useState('')
  const [siblingLoading, setSiblingLoading] = useState(false)
  const [showSiblingForm, setShowSiblingForm] = useState(false)

  const notifiedIds = useRef(new Set())
  // Maps student_id → absent_today row { id, student_id } for DELETE fallback
  const absentRowsRef = useRef({})

  // Fetch student details whenever studentIds changes
  useEffect(() => {
    if (!studentIds.length) return
    supabase.from('students').select('id, name, class_id, parent_code').in('id', studentIds)
      .then(({ data }) => { if (data) setStudents(data) })
  }, [studentIds])

  // Fetch today's pickups + subscribe to realtime changes
  useEffect(() => {
    if (!studentIds.length) return
    const today = new Date().toISOString().slice(0, 10)

    supabase.from('pickup_requests').select('*')
      .in('student_id', studentIds)
      .gte('requested_at', today + 'T00:00:00.000Z')
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(p => { map[p.student_id] = p })
          setPickups(map)
        }
      })

    const channel = supabase
      .channel(`parent_pickups:${school.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'pickup_requests',
        filter: `school_id=eq.${school.id}`,
      }, ({ new: row }) => {
        if (studentIds.includes(row.student_id))
          setPickups(prev => ({ ...prev, [row.student_id]: row }))
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pickup_requests',
        filter: `school_id=eq.${school.id}`,
      }, ({ new: row }) => {
        if (studentIds.includes(row.student_id))
          setPickups(prev => ({ ...prev, [row.student_id]: row }))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'pickup_requests',
        filter: `school_id=eq.${school.id}`,
      }, ({ old: row }) => {
        if (studentIds.includes(row.student_id))
          setPickups(prev => { const n = { ...prev }; delete n[row.student_id]; return n })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [studentIds, school.id])

  // Fetch + watch absent status for these students
  useEffect(() => {
    if (!studentIds.length) return
    const today = new Date().toISOString().slice(0, 10)
    // Select id too so the DELETE handler can fall back to id-based lookup
    // when REPLICA IDENTITY FULL is not set on absent_today.
    supabase.from('absent_today').select('id, student_id').in('student_id', studentIds).eq('date', today)
      .then(({ data }) => {
        if (!data) return
        const rowMap = {}
        data.forEach(r => { rowMap[r.student_id] = r })
        absentRowsRef.current = rowMap
        setAbsentIds(new Set(data.map(r => r.student_id)))
      })

    const channel = supabase.channel(`parent_absent:${school.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absent_today', filter: `school_id=eq.${school.id}` },
        ({ new: row }) => {
          if (!studentIds.includes(row.student_id)) return
          absentRowsRef.current[row.student_id] = row
          setAbsentIds(prev => new Set([...prev, row.student_id]))
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'absent_today', filter: `school_id=eq.${school.id}` },
        ({ old: row }) => {
          // With REPLICA IDENTITY FULL row.student_id is populated; otherwise
          // fall back to scanning our local ref by primary key id.
          const studentId = row.student_id
            || Object.keys(absentRowsRef.current).find(
                sid => absentRowsRef.current[sid]?.id === row.id
               )
          if (!studentId || !studentIds.includes(studentId)) return
          delete absentRowsRef.current[studentId]
          setAbsentIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [studentIds, school.id])

  // Geolocation watcher
  useEffect(() => {
    if (school.active_start_time && !isWithinActiveHours(school)) {
      setGeoStatus('outsideHours')
      return
    }
    if (!school.latitude || !school.longitude) {
      setGeoStatus('error')
      setLocationErr('School location is not configured yet. Ask your school admin to set it up.')
      return
    }
    if (!navigator.geolocation) {
      setGeoStatus('error')
      setLocationErr('Your browser does not support location services.')
      return
    }

    setGeoStatus('locating')

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = haversineMeters(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          { latitude: Number(school.latitude), longitude: Number(school.longitude) }
        )
        if (dist < NEARBY_METERS) {
          studentIds.forEach(id => {
            if (notifiedIds.current.has(id)) return
            notifiedIds.current.add(id)
            supabase.from('parent_nearby').select('id')
              .eq('school_id', school.id).eq('student_id', id)
              .is('dismissed_at', null).is('converted_at', null).maybeSingle()
              .then(({ data: existing }) => {
                if (!existing)
                  supabase.from('parent_nearby').insert({ school_id: school.id, student_id: id }).then()
              })
          })
          setGeoStatus('nearby')
        } else {
          setGeoStatus(prev => prev === 'nearby' ? 'nearby' : 'locating')
        }
      },
      (err) => {
        setGeoStatus('error')
        setLocationErr(
          err.code === 1
            ? 'Location access was denied. Enable location permissions in your browser settings.'
            : err.message
        )
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIds, school])

  const handleAddSibling = async () => {
    const code = siblingCode.trim()
    if (!code) return
    setSiblingErr('')
    setSiblingLoading(true)
    try {
      const { data: sibling } = await supabase.from('students').select('id, name, parent_group_id')
        .eq('school_id', school.id).eq('parent_code', code).maybeSingle()
      if (!sibling) { setSiblingErr('Student code not found at this school.'); return }
      if (studentIds.includes(sibling.id)) { setSiblingErr('That student is already linked.'); return }

      // Determine or create the shared parent_group_id
      const { data: existingStudents } = await supabase.from('students').select('id, parent_group_id')
        .in('id', studentIds)
      const existingGroupId = existingStudents?.find(s => s.parent_group_id)?.parent_group_id
      const groupId = existingGroupId || crypto.randomUUID()

      // If group was just created, update all currently-linked students
      if (!existingGroupId) {
        await supabase.from('students').update({ parent_group_id: groupId }).in('id', studentIds)
      }
      // Link the new sibling into the group
      await supabase.from('students').update({ parent_group_id: groupId }).eq('id', sibling.id)

      const updated = [...studentIds, sibling.id]
      setStudentIds(updated)
      saveIds(updated)
      setSiblingCode('')
      setShowSiblingForm(false)
    } catch {
      setSiblingErr('Something went wrong. Try again.')
    } finally {
      setSiblingLoading(false)
    }
  }

  const handleUnlink = async (studentId) => {
    try {
      await supabase.from('students').update({ parent_group_id: null }).eq('id', studentId)
      const updated = studentIds.filter(id => id !== studentId)
      setStudentIds(updated)
      saveIds(updated)
      setStudents(prev => prev.filter(s => s.id !== studentId))
    } catch {
      // silently ignore — student card stays visible
    }
  }

  const handleMarkAbsent = async (studentId) => {
    const today = new Date().toISOString().slice(0, 10)
    setAbsentIds(prev => new Set([...prev, studentId]))
    const { data } = await supabase
      .from('absent_today')
      .upsert({ student_id: studentId, school_id: school.id, date: today })
      .select()
      .single()
    if (data) absentRowsRef.current[studentId] = data
  }

  const handleMarkPresent = async (studentId) => {
    const today = new Date().toISOString().slice(0, 10)
    setAbsentIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
    delete absentRowsRef.current[studentId]
    await supabase.from('absent_today').delete().eq('student_id', studentId).eq('date', today)
  }

  const handleLogout = () => {
    saveIds([])
    notifiedIds.current.clear()
    onLogout()
  }

  const banner = resolveBanner(geoStatus, pickups, studentIds, locationErr)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <img src="/icon-192.png" alt="Cadence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Cadence</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 2 }}>Parent</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Sign Out
        </button>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* School name */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{school.name}</div>

        {/* Status banner */}
        <div style={{ background: banner.bg, border: `1.5px solid ${banner.border}`, borderRadius: 'var(--radius)', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{banner.icon}</span>
          <div style={{ fontSize: 14, color: banner.color, lineHeight: 1.5, fontWeight: banner.bold ? 700 : 400 }}>{banner.text}</div>
        </div>

        {/* Student cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            {students.length === 1 ? 'Your Student' : 'Your Students'}
          </div>
          {students.map(stu => {
            const label = geoStatus === 'nearby' ? studentPickupLabel(pickups[stu.id]) : null
            const isAbsent = absentIds.has(stu.id)
            const hasActivePickup = !!pickups[stu.id]
            return (
              <div key={stu.id} style={{
                background: isAbsent ? 'var(--yellow-light)' : 'var(--surface)',
                border: `1.5px solid ${isAbsent ? 'var(--yellow)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isAbsent ? 0.85 : 1,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {stu.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{stu.name}</div>
                  {stu.parent_code && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.06em' }}>{stu.parent_code}</div>
                  )}
                  {label && (
                    <div style={{ fontSize: 12, color: label.color, fontWeight: 600, marginTop: 2 }}>{label.text}</div>
                  )}
                  {isAbsent ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: 'oklch(0.45 0.13 80)', fontWeight: 600 }}>Marked absent today</div>
                      <button onClick={() => handleMarkPresent(stu.id)} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline' }}>Undo</button>
                    </div>
                  ) : !hasActivePickup && (
                    <button onClick={() => handleMarkAbsent(stu.id)} style={{ marginTop: 4, fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline' }}>Mark absent today</button>
                  )}
                </div>
                {students.length > 1 && (
                  <button
                    onClick={() => handleUnlink(stu.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 600, padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}
                  >
                    Unlink
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add sibling */}
        {!showSiblingForm ? (
          <button
            onClick={() => setShowSiblingForm(true)}
            style={{ background: 'none', border: 'none', color: 'var(--blue)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            + Add another student (sibling)
          </button>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Add Sibling</div>
            <input
              value={siblingCode}
              onChange={e => { setSiblingCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()); setSiblingErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleAddSibling()}
              placeholder="e.g. JO123456"
              autoCapitalize="characters"
              autoCorrect="off"
              maxLength={8}
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text)', outline: 'none', letterSpacing: '0.1em' }}
            />
            {siblingErr && <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{siblingErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAddSibling}
                disabled={siblingLoading || !siblingCode}
                style={{ flex: 1, background: siblingLoading || !siblingCode ? 'var(--blue-mid)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: siblingLoading || !siblingCode ? 'default' : 'pointer' }}
              >
                {siblingLoading ? 'Checking…' : 'Add'}
              </button>
              <button
                onClick={() => { setShowSiblingForm(false); setSiblingErr(''); setSiblingCode('') }}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer', color: 'var(--text-2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
