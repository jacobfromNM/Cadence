// src/views/StaffView.jsx
//
// Three tabs: Students (search-first), Active (live pickups), Classes (drill-down)
// The Students tab is the primary workflow — search fires Parent Here inline.

import React, { useState } from 'react'
import { useCadence } from '../context/CadenceContext'
import { useToast } from '../context/ToastContext'
import { Avatar, StatusPill, EmptyState, SectionLabel, SearchBar } from '../components/ui'
import { AppShell } from '../components/AppShell'
import { ParentNearbyAlert } from '../components/ParentNearbyAlert'
import { isWithinActiveHours } from '../lib/activeHours'

// ── Shared back-button header used in drill-down screens ──────
function ScreenHeader({ onBack, title, subtitle, right }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

// ── Students Tab ──────────────────────────────────────────────
function StudentsTab({ onDrillClass }) {
  const { classes, students, pickups, requestPickup, completePickup, isAbsent, formatTime } = useCadence()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All')
  const [showComplete, setShowComplete] = useState(false)

  const getClass = (id) => classes.find(c => c.id === id)

  const filtered = students.filter(s => {
    const cls = getClass(s.class_id)
    const q = query.toLowerCase()
    const matchQuery = !q
      || s.name.toLowerCase().includes(q)
      || cls?.code.toLowerCase().includes(q)
      || cls?.teacher_name.toLowerCase().includes(q)
    const matchGrade = gradeFilter === 'All'
      || cls?.code.toUpperCase().startsWith(gradeFilter)
    const matchComplete = !showComplete || pickups[s.id]?.status === 'complete'
    return matchQuery && matchGrade && matchComplete
  })

  const isSearching = query.trim().length > 0

  const handleParentHere = (student) => {
    const cls = getClass(student.class_id)
    try {
      requestPickup(student.id)
      showToast({
        type: 'success',
        title: 'Request sent!',
        sub: `${student.name} → ${cls?.teacher_name} (${cls?.code})`,
        duration: 3200,
      })
    } catch {
      showToast({ type: 'error', title: 'Something went wrong', sub: 'Check your connection and try again.' })
    }
  }

  const handleComplete = (student) => {
    completePickup(student.id)
    showToast({ type: 'success', title: `${student.name} delivered! ✓`, duration: 2400 })
  }

  const gradeOptions = ['All', 'KG', '1', '2', '3', '4', '5']

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search + filter */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexShrink: 0 }}>
        <SearchBar value={query} onChange={setQuery} placeholder="Student, teacher, or class code…" />
        {/* Filter chips — Complete toggle + grade filters */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, padding: '10px 16px 0', overflowX: 'auto' }}>
          {/* Complete toggle — to the left of grade chips */}
          <button
            onClick={() => setShowComplete(c => !c)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: showComplete ? 'var(--green)' : 'var(--surface)',
              border: `1.5px solid ${showComplete ? 'var(--green)' : 'var(--border)'}`,
              color: showComplete ? '#fff' : 'var(--text-2)',
              fontFamily: 'var(--font-body)',
            }}
          >
            ✓ Complete
          </button>
          {gradeOptions.map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: gradeFilter === g ? 'var(--blue)' : 'var(--surface)',
                border: `1.5px solid ${gradeFilter === g ? 'var(--blue)' : 'var(--border)'}`,
                color: gradeFilter === g ? '#fff' : 'var(--text-2)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {g === 'All' ? 'All grades' : `Grade ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <EmptyState icon="🔍" title="No students found" sub="Try a different name, teacher, or class code" />
        )}

        {/* ── Search mode: inline Parent Here buttons ─────── */}
        {isSearching && filtered.length > 0 && (
          <>
            <SectionLabel>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</SectionLabel>
            {filtered.map(s => {
              const cls = getClass(s.class_id)
              const pickup = pickups[s.id]
              const absent = isAbsent(s.id)

              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', padding: '13px 16px', gap: 12,
                  background: 'var(--surface)', borderBottom: '1px solid var(--border)',
                }}>
                  <Avatar name={s.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                    {s.parent_code && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {cls?.code} · {cls?.teacher_name}
                    </div>
                    {pickup?.requested_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        Req. {formatTime(pickup.requested_at)}
                        {pickup.sent_at ? ` · Sent ${formatTime(pickup.sent_at)}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Action button — changes based on current pickup state */}
                  {absent ? (
                    <span style={{ background: 'oklch(0.94 0.04 60)', color: 'oklch(0.45 0.13 55)', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>🟠 Absent</span>
                  ) : !pickup ? (
                    <button
                      onClick={() => handleParentHere(s)}
                      style={{ flexShrink: 0, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >✋ Parent Here</button>
                  ) : pickup.status === 'requested' ? (
                    <span style={{ background: 'var(--yellow-light)', color: 'oklch(0.45 0.13 80)', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>🟡 Waiting…</span>
                  ) : pickup.status === 'sent' ? (
                    <button
                      onClick={() => handleComplete(s)}
                      style={{ flexShrink: 0, background: 'oklch(0.68 0.19 48)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >Mark as Delivered</button>
                  ) : (
                    <span style={{ background: 'var(--green-light)', color: 'var(--green)', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>🟢 Done</span>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── Browse mode: standard list ───────────────────── */}
        {!isSearching && filtered.map(s => {
          const cls = getClass(s.class_id)
          const pickup = pickups[s.id]
          const absent = isAbsent(s.id)
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12,
              background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            }}>
              <Avatar name={s.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                {s.parent_code && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{cls?.code} · {cls?.teacher_name}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {absent ? (
                  <span style={{ background: 'oklch(0.94 0.04 60)', color: 'oklch(0.45 0.13 55)', fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 20 }}>🟠 Absent</span>
                ) : !pickup ? (
                  <button onClick={() => handleParentHere(s)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✋ Parent Here</button>
                ) : pickup.status === 'requested' ? <StatusPill status="requested" />
                  : pickup.status === 'sent' ? (
                    <button onClick={() => handleComplete(s)} style={{ background: 'oklch(0.68 0.19 48)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Mark as Delivered</button>
                  ) : <StatusPill status="complete" />
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Active Pickups Tab ────────────────────────────────────────
function ActiveTab() {
  const { activePickups, completePickup, formatTime } = useCadence()
  const { showToast } = useToast()
  const active = activePickups()

  const handleComplete = (student) => {
    completePickup(student.id)
    showToast({ type: 'success', title: `${student.name} delivered! ✓`, duration: 2400 })
  }

  if (!active.length) {
    return <EmptyState icon="☀️" title="All clear!" sub="No active pickups. Tap Parent Here on any student to start one." />
  }

  return (
    <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <SectionLabel>{active.length} active pickup{active.length !== 1 ? 's' : ''}</SectionLabel>
      {active.map(({ student, pickup, cls }) => (
        <div key={student.id} style={{
          margin: '10px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)',
          border: `1.5px solid ${pickup.status === 'requested' ? 'var(--yellow)' : pickup.status === 'sent' ? 'var(--blue)' : 'var(--green)'}`,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar name={student.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{student.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{cls?.code} · {cls?.teacher_name}</div>
              </div>
              <StatusPill status={pickup.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
              Requested {formatTime(pickup.requested_at)}
              {pickup.sent_at && ` · Sent ${formatTime(pickup.sent_at)}`}
            </div>
            {pickup.status === 'sent' && (
              <button
                onClick={() => handleComplete(student)}
                style={{ width: '100%', background: 'oklch(0.68 0.19 48)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Mark as Delivered
              </button>
            )}
            {pickup.status === 'requested' && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', padding: '4px 0' }}>
                Waiting for teacher to send student out…
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Classes Tab + Drill-down ──────────────────────────────────
function ClassesTab({ onDrill }) {
  const { classes, students, pickupsForClass } = useCadence()
  return (
    <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
      <SectionLabel>{classes.length} classes</SectionLabel>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
        {classes.map(cls => {
          const pending = pickupsForClass(cls.id).filter(p => p.pickup.status !== 'complete').length
          const total = students.filter(s => s.class_id === cls.id).length
          return (
            <div key={cls.id} onClick={() => onDrill(cls)} style={{
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              border: `1.5px solid ${pending ? 'var(--yellow)' : 'var(--border)'}`,
              padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: pending ? 'var(--yellow-light)' : 'var(--blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
                color: pending ? 'oklch(0.45 0.13 80)' : 'var(--blue)',
              }}>{cls.code}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{cls.teacher_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{total} students</div>
              </div>
              {pending > 0 && (
                <div style={{ background: 'var(--yellow)', color: 'oklch(0.25 0.05 80)', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
                  {pending} active
                </div>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18,flexShrink:0}}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ClassDrillScreen({ cls, onBack }) {
  const { studentsInClass, pickups, requestPickup, completePickup, isAbsent, formatTime } = useCadence()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const allStudents = studentsInClass(cls.id)
  const filtered = allStudents.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()))

  const handleParentHere = (s) => {
    requestPickup(s.id)
    showToast({ type: 'success', title: 'Request sent!', sub: `${s.name} → ${cls.teacher_name}`, duration: 3000 })
  }
  const handleComplete = (s) => {
    completePickup(s.id)
    showToast({ type: 'success', title: `${s.name} delivered! ✓`, duration: 2400 })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ScreenHeader
        onBack={onBack}
        title={cls.teacher_name}
        subtitle={cls.code}
        right={<span style={{ fontSize: 13, color: 'var(--text-3)' }}>{allStudents.length} students</span>}
      />
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexShrink: 0 }}>
        <SearchBar value={query} onChange={setQuery} placeholder={`Filter ${cls.code} students…`} />
      </div>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(s => {
          const pickup = pickups[s.id]
          const absent = isAbsent(s.id)
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12,
              background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            }}>
              <Avatar name={s.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                {s.parent_code && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                )}
                {pickup && <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Req. {formatTime(pickup.requested_at)}</div>}
              </div>
              {absent ? (
                <span style={{ background: 'oklch(0.94 0.04 60)', color: 'oklch(0.45 0.13 55)', fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 20 }}>🟠 Absent</span>
              ) : !pickup ? (
                <button onClick={() => handleParentHere(s)} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✋ Parent Here</button>
              ) : pickup.status === 'requested' ? <StatusPill status="requested" />
                : pickup.status === 'sent' ? (
                  <button onClick={() => handleComplete(s)} style={{ background: 'oklch(0.68 0.19 48)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Mark as Delivered</button>
                ) : <StatusPill status="complete" />
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── StaffView root ────────────────────────────────────────────
export function StaffView({ school, loginRole, viewRole, onLogout, onHelp }) {
  const [tab, setTab]           = useState('students')
  const [drillClass, setDrillClass] = useState(null)

  if (drillClass) {
    return (
      <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={setTab} onLogout={onLogout} onHelp={onHelp}>
        <ClassDrillScreen cls={drillClass} onBack={() => setDrillClass(null)} />
      </AppShell>
    )
  }

  return (
    <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={setTab} onLogout={onLogout} onHelp={onHelp}>
      <ParentNearbyAlert />
      {school?.active_start_time && !isWithinActiveHours(school) && (
        <div style={{ background: 'var(--yellow-light)', borderBottom: '1px solid var(--yellow)', padding: '10px 16px', fontSize: 13, color: 'oklch(0.45 0.13 80)', fontWeight: 600, flexShrink: 0 }}>
          Outside active hours — pickup requests are not currently being processed
        </div>
      )}
      {tab === 'students' && <StudentsTab onDrillClass={setDrillClass} />}
      {tab === 'active'   && <ActiveTab />}
      {tab === 'classes'  && <ClassesTab onDrill={setDrillClass} />}
    </AppShell>
  )
}
