// src/views/MessengerView.jsx
//
// Admin-only view for composing and managing school-wide announcements.
// Announcements are stored on the schools row and broadcast in real-time
// to all connected staff, teacher, admin, and parent views.

import React, { useState } from 'react'
import { useCadence } from '../context/CadenceContext'
import { useToast } from '../context/ToastContext'

const MAX_CHARS = 140

export function MessengerView({ school, onLogout }) {
  const { announcement, sendAnnouncement, clearAnnouncement } = useCadence()
  const { showToast } = useToast()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleSend = async () => {
    const text = draft.trim()
    if (!text) return
    setSending(true)
    await sendAnnouncement(text)
    setDraft('')
    showToast({ type: 'success', title: 'Announcement sent!', sub: 'All connected views will see it instantly.', duration: 3000 })
    setSending(false)
  }

  const handleClear = async () => {
    setClearing(true)
    await clearAnnouncement()
    showToast({ type: 'info', title: 'Announcement cleared', duration: 2000 })
    setClearing(false)
  }

  const remaining = MAX_CHARS - draft.length
  const overLimit = remaining < 0

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Messenger</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{school.name}</div>
          </div>
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Compose */}
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>New Announcement</div>
          <div style={{ position: 'relative' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, MAX_CHARS + 10))}
              placeholder="Type your school-wide message here…"
              rows={4}
              style={{
                width: '100%', resize: 'vertical',
                background: 'var(--bg)', border: `1.5px solid ${overLimit ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px',
                fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)',
                outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 8, right: 10,
              fontSize: 11, fontWeight: 600,
              color: overLimit ? 'var(--red)' : remaining <= 20 ? 'oklch(0.55 0.15 50)' : 'var(--text-3)',
            }}>
              {remaining}
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim() || overLimit}
            style={{
              background: sending || !draft.trim() || overLimit ? 'var(--blue-mid)' : 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
              cursor: sending || !draft.trim() || overLimit ? 'default' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : '📣 Send Announcement'}
          </button>
        </div>

        {/* Current announcement */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
            Current Announcement
          </div>

          {announcement ? (
            <div style={{
              background: 'oklch(0.96 0.04 245)', border: '1.5px solid var(--blue)',
              borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 15, color: 'var(--blue)', fontWeight: 600, lineHeight: 1.5 }}>
                {announcement}
              </div>
              <button
                onClick={handleClear}
                disabled={clearing}
                style={{
                  background: 'var(--bg)', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '9px 14px', fontFamily: 'var(--font-body)',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                  cursor: clearing ? 'default' : 'pointer', alignSelf: 'flex-start',
                }}
              >
                {clearing ? 'Clearing…' : '🗑 Clear Announcement'}
              </button>
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 16,
              fontSize: 14, color: 'var(--text-3)', fontStyle: 'italic',
            }}>
              No active announcement. Send one above to notify all parents, staff, and teachers instantly.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
