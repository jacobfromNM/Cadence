// src/context/CadenceContext.jsx
//
// Global state wired to Supabase.
// - All data is fetched from the database on mount (when schoolId is set)
// - All mutations write to Supabase first with optimistic local updates
// - Real-time subscriptions push changes from other devices instantly
//
// Real-time coverage:
//   pickup_requests → staff + teacher views sync across all devices
//   absent_today    → absent markers sync across devices
//   students        → new students added by admin appear for staff immediately
//   classes         → new classes appear for staff immediately

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const CadenceCtx = createContext(null)

export function CadenceProvider({ children }) {
  // schoolId is null until login — no data fetched until then
  const [schoolId,      setSchoolId]      = useState(null)
  const [classes,       setClasses]       = useState([])
  const [students,      setStudents]      = useState([])
  // pickups: { [studentId]: { id, status, requested_at, sent_at, completed_at, ... } }
  const [pickups,       setPickups]       = useState({})
  // absent: Set of student IDs marked absent today
  const [absent,        setAbsent]        = useState(new Set())
  // parentNearby: { [studentId]: parent_nearby_row } — only active (dismissed_at IS NULL) rows
  const [parentNearby,  setParentNearby]  = useState({})
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  // Track active Supabase channels so we can clean up on logout
  const channelsRef = useRef([])
  // Maps student_id → absent_today row { id, student_id } so DELETE events
  // (which only carry the primary key by default) can find the right student.
  const absentRowsRef = useRef({})

  // ── Initialise for a school (called from App after login) ──────────────
  const initSchool = useCallback(async (id) => {
    setSchoolId(id)
    setLoading(true)
    setError(null)

    try {
      const today = new Date().toISOString().slice(0, 10)

      // Fetch everything for this school in parallel
      const [classRes, studentRes, pickupRes, absentRes, nearbyRes] = await Promise.all([
        supabase.from('classes')
          .select('*')
          .eq('school_id', id)
          .order('code'),
        supabase.from('students')
          .select('*')
          .eq('school_id', id)
          .order('name'),
        supabase.from('pickup_requests')
          .select('*')
          .eq('school_id', id)
          .gte('requested_at', today + 'T00:00:00.000Z'),
        supabase.from('absent_today')
          .select('student_id')
          .eq('school_id', id)
          .eq('date', today),
        supabase.from('parent_nearby')
          .select('*')
          .eq('school_id', id)
          .is('dismissed_at', null)
          .is('converted_at', null)
          .gte('created_at', today + 'T00:00:00.000Z'),
      ])

      if (classRes.error)   throw classRes.error
      if (studentRes.error) throw studentRes.error
      if (pickupRes.error)  throw pickupRes.error
      if (absentRes.error)  throw absentRes.error
      if (nearbyRes.error)  throw nearbyRes.error

      setClasses(classRes.data)
      setStudents(studentRes.data)

      // Convert pickup rows into { [studentId]: pickup } map
      const pickupMap = {}
      pickupRes.data.forEach(p => { pickupMap[p.student_id] = p })
      setPickups(pickupMap)

      const absentRowMap = {}
      absentRes.data.forEach(r => { absentRowMap[r.student_id] = r })
      absentRowsRef.current = absentRowMap
      setAbsent(new Set(absentRes.data.map(r => r.student_id)))

      // Convert parent_nearby rows into { [studentId]: row } map
      const nearbyMap = {}
      nearbyRes.data.forEach(r => { nearbyMap[r.student_id] = r })
      setParentNearby(nearbyMap)
    } catch (err) {
      console.error('Cadence initSchool error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }

    _subscribeToSchool(id)
  }, [])

  // ── Clear state and close subscriptions on logout ──────────────────────
  const clearSchool = useCallback(() => {
    setSchoolId(null)
    setClasses([])
    setStudents([])
    setPickups({})
    setAbsent(new Set())
    setParentNearby({})
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []
    absentRowsRef.current = {}
  }, [])

  // ── Real-time subscriptions ────────────────────────────────────────────
  function _subscribeToSchool(id) {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []

    // pickup_requests — most critical for real-time UX
    const pickupCh = supabase
      .channel(`pickups:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'pickup_requests', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setPickups(prev => ({ ...prev, [row.student_id]: row }))
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'pickup_requests', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setPickups(prev => ({ ...prev, [row.student_id]: row }))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'pickup_requests', filter: `school_id=eq.${id}`,
      }, ({ old: row }) => {
        setPickups(prev => {
          const n = { ...prev }
          Object.keys(n).forEach(k => { if (n[k].id === row.id) delete n[k] })
          return n
        })
      })
      .subscribe()

    // absent_today — teacher marks absent, staff sees it instantly
    //
    // NOTE: Supabase Realtime DELETE events only carry the primary key (id) by
    // default. Run `ALTER TABLE public.absent_today REPLICA IDENTITY FULL;` in
    // your Supabase SQL editor so that student_id is also included. The
    // absentRowsRef fallback below handles the case where it hasn't been run yet.
    const absentCh = supabase
      .channel(`absent:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'absent_today', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        absentRowsRef.current[row.student_id] = row
        setAbsent(prev => { const n = new Set(prev); n.add(row.student_id); return n })
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'absent_today', filter: `school_id=eq.${id}`,
      }, ({ old: row }) => {
        // With REPLICA IDENTITY FULL, row.student_id is populated directly.
        // Without it, fall back to scanning our local ref by primary key id.
        const studentId = row.student_id
          || Object.keys(absentRowsRef.current).find(
              sid => absentRowsRef.current[sid]?.id === row.id
             )
        if (!studentId) return
        delete absentRowsRef.current[studentId]
        setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
      })
      .subscribe()

    // students — admin adds student, staff sees them right away
    const studentCh = supabase
      .channel(`students:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'students', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setStudents(prev =>
          prev.some(s => s.id === row.id)
            ? prev
            : [...prev, row].sort((a, b) => a.name.localeCompare(b.name))
        )
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'students', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setStudents(prev => prev.map(s => s.id === row.id ? row : s))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'students', filter: `school_id=eq.${id}`,
      }, ({ old: row }) => {
        setStudents(prev => prev.filter(s => s.id !== row.id))
      })
      .subscribe()

    // classes — admin adds class, staff sees it
    const classCh = supabase
      .channel(`classes:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'classes', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setClasses(prev =>
          prev.some(c => c.id === row.id)
            ? prev
            : [...prev, row].sort((a, b) => a.code.localeCompare(b.code))
        )
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'classes', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => {
        setClasses(prev => prev.map(c => c.id === row.id ? row : c))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'classes', filter: `school_id=eq.${id}`,
      }, ({ old: row }) => {
        setClasses(prev => prev.filter(c => c.id !== row.id))
      })
      .subscribe()

    // parent_nearby — staff/teachers see incoming parent alerts instantly
    const nearbyHandler = ({ new: row, old: oldRow, eventType }) => {
      if (eventType === 'DELETE') {
        setParentNearby(prev => {
          const n = { ...prev }
          Object.keys(n).forEach(k => { if (n[k].id === oldRow.id) delete n[k] })
          return n
        })
        return
      }
      // Keep only active rows (no dismissed_at or converted_at)
      if (row.dismissed_at || row.converted_at) {
        setParentNearby(prev => {
          const n = { ...prev }
          Object.keys(n).forEach(k => { if (n[k].id === row.id) delete n[k] })
          return n
        })
      } else {
        setParentNearby(prev => ({ ...prev, [row.student_id]: row }))
      }
    }

    const nearbyCh = supabase
      .channel(`parent_nearby:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'parent_nearby', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => nearbyHandler({ new: row, old: null, eventType: 'INSERT' }))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'parent_nearby', filter: `school_id=eq.${id}`,
      }, ({ new: row }) => nearbyHandler({ new: row, old: null, eventType: 'UPDATE' }))
      .subscribe()

    channelsRef.current = [pickupCh, absentCh, studentCh, classCh, nearbyCh]
  }

  // Clean up when the provider unmounts
  useEffect(() => {
    return () => channelsRef.current.forEach(ch => supabase.removeChannel(ch))
  }, [])

  // ── Pickup actions ─────────────────────────────────────────────────────

  const requestPickup = useCallback(async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    // Optimistic — UI responds immediately
    const optimistic = {
      status: 'requested',
      requested_at: new Date().toISOString(),
      sent_at: null,
      completed_at: null,
      student_id: studentId,
    }
    setPickups(p => ({ ...p, [studentId]: optimistic }))

    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        student_id:   studentId,
        class_id:     student.class_id,
        school_id:    student.school_id,
        status:       'requested',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      // Roll back on failure
      setPickups(p => { const n = { ...p }; delete n[studentId]; return n })
      throw error
    }

    // Replace optimistic entry with the real row (has the DB-generated UUID)
    setPickups(p => ({ ...p, [studentId]: data }))
  }, [students])

  const sendStudent = useCallback(async (studentId) => {
    const current = pickups[studentId]
    if (!current?.id) return

    setPickups(p => ({
      ...p,
      [studentId]: { ...p[studentId], status: 'sent', sent_at: new Date().toISOString() },
    }))

    const { error } = await supabase
      .from('pickup_requests')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', current.id)

    if (error) {
      setPickups(p => ({ ...p, [studentId]: current })) // roll back
      throw error
    }
  }, [pickups])

  const completePickup = useCallback(async (studentId) => {
    const current = pickups[studentId]
    if (!current?.id) return

    setPickups(p => ({
      ...p,
      [studentId]: { ...p[studentId], status: 'complete', completed_at: new Date().toISOString() },
    }))

    const { error } = await supabase
      .from('pickup_requests')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', current.id)

    if (error) {
      setPickups(p => ({ ...p, [studentId]: current })) // roll back
      throw error
    }
  }, [pickups])

  const cancelPickup = useCallback(async (studentId) => {
    const current = pickups[studentId]
    if (!current?.id) return

    setPickups(p => { const n = { ...p }; delete n[studentId]; return n })

    const { error } = await supabase
      .from('pickup_requests')
      .delete()
      .eq('id', current.id)

    if (error) {
      setPickups(p => ({ ...p, [studentId]: current })) // roll back
      throw error
    }
  }, [pickups])

  // ── Parent Nearby actions ──────────────────────────────────────────────

  const reportParentNearby = useCallback(async (sid, studentId) => {
    // Guard: skip if there's already an active alert for this student today
    const { data: existing } = await supabase
      .from('parent_nearby')
      .select('id')
      .eq('school_id', sid)
      .eq('student_id', studentId)
      .is('dismissed_at', null)
      .is('converted_at', null)
      .maybeSingle()

    if (existing) return

    const { data, error } = await supabase
      .from('parent_nearby')
      .insert({ school_id: sid, student_id: studentId })
      .select()
      .single()

    if (error) throw error
    setParentNearby(prev => ({ ...prev, [studentId]: data }))
  }, [])

  const dismissParentNearby = useCallback(async (studentId) => {
    const current = parentNearby[studentId]
    if (!current?.id) return

    setParentNearby(prev => { const n = { ...prev }; delete n[studentId]; return n })

    const { error } = await supabase
      .from('parent_nearby')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', current.id)

    if (error) {
      setParentNearby(prev => ({ ...prev, [studentId]: current }))
      throw error
    }
  }, [parentNearby])

  const convertParentNearby = useCallback(async (studentId) => {
    const current = parentNearby[studentId]
    if (!current?.id) return

    setParentNearby(prev => { const n = { ...prev }; delete n[studentId]; return n })

    const [updateRes] = await Promise.all([
      supabase.from('parent_nearby')
        .update({ converted_at: new Date().toISOString() })
        .eq('id', current.id),
    ])

    if (updateRes.error) {
      setParentNearby(prev => ({ ...prev, [studentId]: current }))
      throw updateRes.error
    }

    // Create the pickup request after marking converted
    await requestPickup(studentId)
  }, [parentNearby, requestPickup])

  // ── Absence actions ────────────────────────────────────────────────────

  const markAbsent = useCallback(async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return

    setAbsent(prev => { const n = new Set(prev); n.add(studentId); return n })
    setPickups(p => { const n = { ...p }; delete n[studentId]; return n })

    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('absent_today')
      .upsert(
        { student_id: studentId, school_id: student.school_id, date: today },
        { onConflict: 'student_id,date' }
      )
      .select()
      .single()

    if (error) {
      setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
      throw error
    }
    // Store the row so the DELETE realtime handler can find it by id
    if (data) absentRowsRef.current[studentId] = data
  }, [students])

  const markPresent = useCallback(async (studentId) => {
    setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
    delete absentRowsRef.current[studentId]

    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('absent_today')
      .delete()
      .eq('student_id', studentId)
      .eq('date', today)

    if (error) {
      setAbsent(prev => { const n = new Set(prev); n.add(studentId); return n })
      throw error
    }
  }, [])

  const isAbsent = useCallback((studentId) => absent.has(studentId), [absent])

  // ── Class management ───────────────────────────────────────────────────

  const addClass = useCallback(async (code, teacherName, sid) => {
    const targetSchoolId = sid || schoolId
    const { data, error } = await supabase
      .from('classes')
      .insert({ school_id: targetSchoolId, code: code.toUpperCase(), teacher_name: teacherName })
      .select()
      .single()

    if (error) throw error
    // Real-time subscription will also fire, but local update is instant
    setClasses(p => [...p, data].sort((a, b) => a.code.localeCompare(b.code)))
    return data.id
  }, [schoolId])

  const editClass = useCallback(async (classId, updates) => {
    setClasses(p => p.map(c => c.id === classId ? { ...c, ...updates } : c))
    const { error } = await supabase.from('classes').update(updates).eq('id', classId)
    if (error) throw error
  }, [])

  const deleteClass = useCallback(async (classId) => {
    const removedStudents = students.filter(s => s.class_id === classId).map(s => s.id)
    setClasses(p => p.filter(c => c.id !== classId))
    setStudents(p => p.filter(s => s.class_id !== classId))
    setPickups(p => { const n = { ...p }; removedStudents.forEach(id => delete n[id]); return n })
    setAbsent(prev => { const n = new Set(prev); removedStudents.forEach(id => n.delete(id)); return n })

    // FK cascade in schema.sql handles removing students + pickups
    const { error } = await supabase.from('classes').delete().eq('id', classId)
    if (error) throw error
  }, [students])

  // ── Student management ─────────────────────────────────────────────────

  const addStudent = useCallback(async (name, classId, sid) => {
    const targetSchoolId = sid || schoolId
    const trimmed = name.trim()

    // Generate a unique parent_code: [first 2 letters of first name][6 random digits]
    const namePrefix = trimmed.split(' ')[0].slice(0, 2).toUpperCase()
    let parentCode
    let codeExists = true
    while (codeExists) {
      parentCode = namePrefix + String(Math.floor(100000 + Math.random() * 900000))
      const { data: found } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', targetSchoolId)
        .eq('parent_code', parentCode)
        .maybeSingle()
      codeExists = !!found
    }
    const parentGroupId = crypto.randomUUID()

    // Upsert so re-importing the same roster doesn't create duplicates.
    // The unique constraint (school_id, class_id, name) lives in the schema;
    // on conflict we do a no-op update so the row (and its id) is returned.
    // Note: on conflict we don't overwrite the parent_code so existing parents
    // aren't disrupted by re-imports.
    const { data, error } = await supabase
      .from('students')
      .upsert(
        { name: trimmed, class_id: classId, school_id: targetSchoolId, parent_code: parentCode, parent_group_id: parentGroupId },
        { onConflict: 'school_id,class_id,name', ignoreDuplicates: true }
      )
      .select()
      .single()

    if (error) throw error
    // Only add to local state when the student isn't already tracked
    setStudents(p =>
      p.some(s => s.id === data.id)
        ? p
        : [...p, data].sort((a, b) => a.name.localeCompare(b.name))
    )
    return data.id
  }, [schoolId])

  const editStudent = useCallback(async (studentId, updates) => {
    setStudents(p => p.map(s => s.id === studentId ? { ...s, ...updates } : s))
    const { error } = await supabase.from('students').update(updates).eq('id', studentId)
    if (error) throw error
  }, [])

  const deleteStudent = useCallback(async (studentId) => {
    setStudents(p => p.filter(s => s.id !== studentId))
    setPickups(p => { const n = { ...p }; delete n[studentId]; return n })
    setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
    const { error } = await supabase.from('students').delete().eq('id', studentId)
    if (error) throw error
  }, [])

  // ── Danger zone ────────────────────────────────────────────────────────

  const resetPickups = useCallback(async () => {
    if (!schoolId) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('pickup_requests')
      .delete()
      .eq('school_id', schoolId)
      .gte('requested_at', today + 'T00:00:00.000Z')
    if (error) throw error
    setPickups({})
  }, [schoolId])

  const resetClassroomData = useCallback(async () => {
    if (!schoolId) return
    await Promise.all([
      supabase.from('classes').delete().eq('school_id', schoolId),
      supabase.from('absent_today').delete().eq('school_id', schoolId),
    ])
    setClasses([])
    setStudents([])
    setPickups({})
    setAbsent(new Set())
  }, [schoolId])

  const deleteSchool = useCallback(async () => {
    if (!schoolId) return
    // REQUIRES SERVICE ROLE after RLS tightening — move to Edge Function in Phase 2
    await supabase.from('schools').delete().eq('id', schoolId)
    clearSchool()
  }, [schoolId, clearSchool])

  const updatePins = useCallback(async ({ adminPin, staffPin }) => {
    if (!schoolId) return
    const updates = {}
    if (adminPin !== undefined) updates.admin_pin_hash = await bcrypt.hash(adminPin, 10)
    if (staffPin !== undefined) updates.staff_pin_hash = await bcrypt.hash(staffPin, 10)
    // REQUIRES SERVICE ROLE after RLS tightening — move to Edge Function in Phase 2
    const { error } = await supabase.from('schools').update(updates).eq('id', schoolId)
    if (error) throw error
  }, [schoolId])

  // ── Query helpers ──────────────────────────────────────────────────────

  const getClass        = useCallback((id) => classes.find(c => c.id === id), [classes])
  const studentsInClass = useCallback((classId) => students.filter(s => s.class_id === classId), [students])
  const pickupsForClass = useCallback((classId) =>
    students
      .filter(s => s.class_id === classId && pickups[s.id])
      .map(s => ({ student: s, pickup: pickups[s.id] })),
    [students, pickups])
  const activePickups   = useCallback(() =>
    students
      .filter(s => pickups[s.id] && pickups[s.id].status !== 'complete')
      .map(s => ({ student: s, pickup: pickups[s.id], cls: getClass(s.class_id) })),
    [students, pickups, getClass])

  // ── Formatting ─────────────────────────────────────────────────────────

  const formatTime = (date) =>
    date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  const avgWaitMinutes = useCallback(() => {
    const completed = Object.values(pickups)
      .filter(p => p.status === 'complete' && p.requested_at && p.completed_at)
      .map(p => (new Date(p.completed_at) - new Date(p.requested_at)) / 60000)
    return completed.length
      ? Math.round(completed.reduce((a, b) => a + b, 0) / completed.length)
      : null
  }, [pickups])

  return (
    <CadenceCtx.Provider value={{
      schoolId, loading, error,
      classes, students, pickups, absent, parentNearby,
      initSchool, clearSchool,
      requestPickup, sendStudent, completePickup, cancelPickup,
      reportParentNearby, dismissParentNearby, convertParentNearby,
      markAbsent, markPresent, isAbsent,
      addClass, editClass, deleteClass,
      addStudent, editStudent, deleteStudent,
      resetPickups, resetClassroomData, deleteSchool, updatePins,
      getClass, studentsInClass, pickupsForClass, activePickups,
      formatTime, avgWaitMinutes,
    }}>
      {children}
    </CadenceCtx.Provider>
  )
}

export const useCadence = () => useContext(CadenceCtx)
