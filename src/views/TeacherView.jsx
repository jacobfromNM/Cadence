// src/views/TeacherView.jsx

import React, { useState, useEffect } from 'react'
import { useCadence } from '../context/CadenceContext'
import { useToast } from '../context/ToastContext'
import { Avatar, StatusPill, EmptyState, SectionLabel } from '../components/ui'
import { AppShell } from '../components/AppShell'
import { ParentNearbyAlert } from '../components/ParentNearbyAlert'
import { isWithinActiveHours } from '../lib/activeHours'

// Ticks every 10 seconds so wait-time badges stay fresh
function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  return now
}

function elapsedMins(requestedAt, now) {
  if (!requestedAt) return 0
  return (now - new Date(requestedAt).getTime()) / 60000
}

function formatElapsed(mins) {
  if (mins < 1) return '< 1m'
  return `${Math.floor(mins)}m`
}

// Color helpers — yellow normally, red when parent has waited > 3 minutes
const C = {
  border:  (urgent) => urgent ? 'oklch(0.70 0.22 25)' : 'oklch(0.80 0.14 80)',
  badge:   (urgent) => urgent ? 'oklch(0.88 0.10 25)' : 'var(--yellow)',
  text:    (urgent) => urgent ? 'oklch(0.55 0.22 25)' : 'oklch(0.50 0.13 80)',
  badgeFg: (urgent) => urgent ? 'oklch(0.30 0.15 25)' : 'oklch(0.25 0.05 80)',
  glow:    (urgent) => urgent ? '0 0 0 3px oklch(0.70 0.22 25 / 0.20)' : '0 0 0 3px oklch(0.80 0.14 80 / 0.20)',
}

export function TeacherView({ school, loginRole, viewRole, onLogout }) {
  const {
    classes, students, pickups, absent,
    sendStudent, markAbsent, markPresent, formatTime,
  } = useCadence()
  const { showToast } = useToast()
  const [selectedClass, setSelectedClass] = useState(null)
  const [tab] = useState('queue')
  const now = useNow()

  const handleSendStudent = (s) => {
    sendStudent(s.id)
    showToast({ type: 'info', title: `${s.name} sent out`, sub: 'Waiting for pickup staff to confirm.', duration: 3000 })
  }

  // ── Class selector (shown if teacher hasn't picked their class) ──
  if (!selectedClass) {
    const allActive = students.filter(s => pickups[s.id] && pickups[s.id].status !== 'complete')
    const anyUrgent = allActive.some(s => elapsedMins(pickups[s.id]?.requested_at, now) > 3)

    return (
      <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => { }} onLogout={onLogout}>
        <ParentNearbyAlert />
        {school?.active_start_time && !isWithinActiveHours(school) && (
          <div style={{ background: 'var(--yellow-light)', borderBottom: '1px solid var(--yellow)', padding: '10px 16px', fontSize: 13, color: 'oklch(0.45 0.13 80)', fontWeight: 600, flexShrink: 0 }}>
            Outside active hours — pickup requests are not currently being processed
          </div>
        )}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Cross-class active summary */}
          {allActive.length > 0 && (
            <div style={{ margin: '12px 16px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text(anyUrgent), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {anyUrgent ? '🔴' : '🟡'} All active requests
                </span>
                <span style={{ background: C.badge(anyUrgent), color: C.badgeFg(anyUrgent), fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                  {allActive.length}
                </span>
              </div>
              <div style={{ background: 'var(--surface)', border: `1.5px solid ${C.border(anyUrgent)}`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {allActive.map((s, i) => {
                  const cls = classes.find(c => c.id === s.class_id)
                  const pickup = pickups[s.id]
                  const mins = elapsedMins(pickup?.requested_at, now)
                  const urgent = mins > 3
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                      borderBottom: i < allActive.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <Avatar name={s.name} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                        {s.parent_code && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {cls?.code} · {cls?.teacher_name}
                        </div>
                        {pickup?.requested_at && (
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 1, color: C.text(urgent), fontWeight: urgent ? 700 : 400 }}>
                            ⏱ {formatElapsed(mins)} waiting
                          </div>
                        )}
                      </div>
                      {pickup?.status === 'requested' ? (
                        <button
                          onClick={() => handleSendStudent(s)}
                          style={{
                            flexShrink: 0, background: urgent ? 'oklch(0.65 0.22 25)' : 'var(--blue)',
                            color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px',
                            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          🚶 Send Out
                        </button>
                      ) : (
                        <StatusPill status={pickup?.status} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <SectionLabel style={{ paddingTop: allActive.length > 0 ? 12 : 14 }}>Select your class</SectionLabel>
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {classes.map(cls => {
              const pending = students.filter(s => s.class_id === cls.id && pickups[s.id] && pickups[s.id].status !== 'complete').length
              return (
                <div key={cls.id} onClick={() => setSelectedClass(cls)} style={{
                  background: 'var(--surface)', borderRadius: 'var(--radius)',
                  border: `1.5px solid ${pending ? 'oklch(0.80 0.14 80)' : 'var(--border)'}`,
                  padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 12,
                    background: pending ? 'var(--yellow-light)' : 'var(--green-light)',
                    color: pending ? 'oklch(0.45 0.13 80)' : 'var(--green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
                  }}>{cls.code}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{cls.teacher_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{cls.code}</div>
                  </div>
                  {pending > 0 && (
                    <div style={{ background: 'var(--yellow)', color: 'oklch(0.25 0.05 80)', fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>{pending} active</div>
                  )}
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )
            })}
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Selected class view ──────────────────────────────────────
  const myStudents = students.filter(s => s.class_id === selectedClass.id)
  const needsToGo = myStudents.filter(s => pickups[s.id]?.status === 'requested')
  const awaitingConfirm = myStudents.filter(s => pickups[s.id]?.status === 'sent')
  const pickedUp = myStudents.filter(s => pickups[s.id]?.status === 'complete')
  const stillHere = myStudents.filter(s => !pickups[s.id] && !absent.has(s.id))
  const absentList = myStudents.filter(s => absent.has(s.id))

  return (
    <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => { }} onLogout={onLogout}>
      <ParentNearbyAlert />
      {school?.active_start_time && !isWithinActiveHours(school) && (
        <div style={{ background: 'var(--yellow-light)', borderBottom: '1px solid var(--yellow)', padding: '10px 16px', fontSize: 13, color: 'oklch(0.45 0.13 80)', fontWeight: 600, flexShrink: 0 }}>
          Outside active hours — pickup requests are not currently being processed
        </div>
      )}
      {/* Class header */}
      <div style={{
        padding: '14px 16px 12px',
        background: 'oklch(0.96 0.04 150)',
        borderBottom: '1px solid oklch(0.88 0.06 150)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            {selectedClass.teacher_name} — {selectedClass.code}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            {school.name}
          </div>
        </div>
        <button
          onClick={() => setSelectedClass(null)}
          style={{ border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-body)', fontWeight: 600, padding: '6px 10px', borderRadius: 8, background: 'oklch(0.90 0.05 150)' }}
        >
          ← Change class
        </button>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>

        {/* SEND OUT NOW — the primary action */}
        {needsToGo.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 4px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'oklch(0.50 0.13 80)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>🟡 Send out now</span>
              <span style={{ background: 'var(--yellow)', color: 'oklch(0.25 0.05 80)', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>{needsToGo.length}</span>
            </div>
            {needsToGo.map((s, i) => {
              const isNewest = i === 0
              const mins = elapsedMins(pickups[s.id]?.requested_at, now)
              const urgent = mins > 3
              return (
                <div key={s.id} style={{
                  margin: '10px 16px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius)',
                  border: isNewest ? `1.5px solid ${C.border(urgent)}` : '1px solid var(--border)',
                  boxShadow: isNewest ? C.glow(urgent) : 'none',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar name={s.name} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{s.name}</div>
                        {s.parent_code && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                          Parent arrived · {formatTime(pickups[s.id]?.requested_at)}
                          {pickups[s.id]?.requested_at && (
                            <span style={{ marginLeft: 6, color: C.text(urgent), fontWeight: urgent ? 700 : 400 }}>
                              · ⏱ {formatElapsed(mins)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isNewest && (
                        <span className="animate-pulse-badge" style={{
                          background: C.badge(urgent), color: C.badgeFg(urgent),
                          fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.05em',
                        }}>{urgent ? '● URGENT' : '● NEW'}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSendStudent(s)}
                      style={{
                        width: '100%', background: 'var(--blue)', color: '#fff', border: 'none',
                        borderRadius: 10, padding: '14px', fontFamily: 'var(--font-body)',
                        fontSize: 16, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      🚶 Send Student Out
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* AWAITING STAFF CONFIRMATION */}
        {awaitingConfirm.length > 0 && (
          <>
            <div style={{ padding: '14px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              🔵 Sent — awaiting handoff
            </div>
            {awaitingConfirm.map(s => (
              <div key={s.id} style={{
                margin: '8px 16px', background: 'oklch(0.97 0.02 245)',
                borderRadius: 'var(--radius)', border: '1px solid var(--blue-mid)', overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={s.name} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                    {s.parent_code && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 1 }}>
                      Sent out · {formatTime(pickups[s.id]?.sent_at)} · Waiting for staff to confirm
                    </div>
                  </div>
                  <StatusPill status="sent" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* EMPTY STATE */}
        {needsToGo.length === 0 && awaitingConfirm.length === 0 && (
          <EmptyState
            icon="☀️"
            title="All clear!"
            sub="No pickup requests right now. You'll see requests here the moment a parent arrives."
          />
        )}

        {/* PICKED UP TODAY */}
        {pickedUp.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px' }} />
            <SectionLabel>✅ Picked up today ({pickedUp.length})</SectionLabel>
            {pickedUp.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10, borderBottom: '1px solid var(--border)', opacity: 0.55 }}>
                <Avatar name={s.name} size={32} />
                <div style={{ flex: 1, fontSize: 15, color: 'var(--text-2)', textDecoration: 'line-through' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatTime(pickups[s.id]?.completed_at)}</div>
              </div>
            ))}
          </>
        )}

        {/* STILL IN CLASS + ABSENCES */}
        {(stillHere.length > 0 || absentList.length > 0) && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 16px' }} />
            {stillHere.length > 0 && (
              <>
                <SectionLabel>🏫 Still in class ({stillHere.length})</SectionLabel>
                {stillHere.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <Avatar name={s.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{s.name}</div>
                      {s.parent_code && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em' }}>{s.parent_code}</div>
                      )}
                    </div>
                    <button
                      onClick={() => markAbsent(s.id)}
                      style={{ background: 'oklch(0.94 0.04 60)', border: '1px solid oklch(0.82 0.10 60)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'oklch(0.45 0.13 55)' }}
                    >
                      Mark Absent
                    </button>
                  </div>
                ))}
              </>
            )}
            {absentList.length > 0 && (
              <>
                <SectionLabel style={{ color: 'oklch(0.50 0.14 50)' }}>🟠 Absent today ({absentList.length})</SectionLabel>
                {absentList.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', opacity: 0.7 }}>
                    <Avatar name={s.name} size={32} />
                    <div style={{ flex: 1, fontSize: 15, color: 'var(--text-2)', fontWeight: 500, textDecoration: 'line-through' }}>{s.name}</div>
                    <button
                      onClick={() => markPresent(s.id)}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        <div style={{ height: 24 }} />
      </div>
    </AppShell>
  )
}
