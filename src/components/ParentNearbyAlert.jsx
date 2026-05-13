// src/components/ParentNearbyAlert.jsx
//
// Shown at the top of StaffView and TeacherView when a parent is nearby.
// One card per active alert — staff can start a pickup or dismiss.

import React, { useState, useEffect } from 'react'
import { useCadence } from '../context/CadenceContext'
import { useToast } from '../context/ToastContext'

function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  return now
}

function elapsedLabel(createdAt, now) {
  const mins = (now - new Date(createdAt).getTime()) / 60000
  if (mins < 1) return '< 1m ago'
  return `${Math.floor(mins)}m ago`
}

export function ParentNearbyAlert() {
  const { parentNearby, students, pickups, dismissParentNearby, convertParentNearby } = useCadence()
  const { showToast } = useToast()
  const now = useNow()

  const activeAlerts = Object.values(parentNearby)

  if (!activeAlerts.length) return null

  const handleStartPickup = async (studentId, studentName) => {
    // Don't create a duplicate pickup request
    if (pickups[studentId]) {
      await dismissParentNearby(studentId)
      showToast({ type: 'info', title: `${studentName} already has an active pickup` })
      return
    }
    try {
      await convertParentNearby(studentId)
      showToast({ type: 'success', title: `Pickup started for ${studentName}` })
    } catch {
      showToast({ type: 'error', title: 'Could not start pickup', sub: 'Check your connection.' })
    }
  }

  const handleDismiss = async (studentId) => {
    try {
      await dismissParentNearby(studentId)
    } catch {
      showToast({ type: 'error', title: 'Could not dismiss alert', sub: 'Check your connection.' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activeAlerts.map(alert => {
        const student = students.find(s => s.id === alert.student_id)
        if (!student) return null
        const firstName = student.name.split(' ')[0]

        return (
          <div
            key={alert.id}
            style={{
              background: 'oklch(0.97 0.08 85)',
              borderBottom: '2px solid oklch(0.78 0.16 85)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>🚗</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.38 0.12 80)', lineHeight: 1.3 }}>
                {student.name}'s parent is nearby
              </div>
              <div style={{ fontSize: 11, color: 'oklch(0.55 0.10 80)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {elapsedLabel(alert.created_at, now)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleStartPickup(student.id, firstName)}
                style={{
                  background: 'var(--green)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '7px 12px',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Start Pickup
              </button>
              <button
                onClick={() => handleDismiss(student.id)}
                style={{
                  background: 'none', border: '1px solid oklch(0.72 0.14 80)',
                  borderRadius: 8, padding: '7px 10px',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'oklch(0.45 0.12 80)', cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
