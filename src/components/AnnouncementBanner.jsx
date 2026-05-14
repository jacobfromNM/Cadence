// src/components/AnnouncementBanner.jsx
//
// Announcement banner for staff/teacher/admin views.
// Always visible: shows the active announcement or a friendly empty-state message.

import React from 'react'
import { useCadence } from '../context/CadenceContext'

export function AnnouncementBanner() {
  const { announcement } = useCadence()

  return (
    <div style={{
      background: announcement ? 'oklch(0.96 0.04 245)' : 'var(--surface)',
      borderBottom: `1px solid ${announcement ? 'var(--blue)' : 'var(--border)'}`,
      padding: '9px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>📣</span>
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block',
        }}>
          Announcement
        </span>
        <span style={{
          fontSize: 13,
          color: announcement ? 'var(--blue)' : 'var(--text-3)',
          fontWeight: announcement ? 600 : 400,
          lineHeight: 1.45,
          display: 'block',
          marginTop: 1,
        }}>
          {announcement || 'None for the day. Go out and do awesome things!'}
        </span>
      </div>
    </div>
  )
}
