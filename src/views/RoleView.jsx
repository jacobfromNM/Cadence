// src/views/RoleView.jsx

import React from 'react'
import { RoleBadge } from '../components/ui'
import { useCadence } from '../context/CadenceContext'

function RoleCard({ icon, title, desc, badge, onClick, dashed }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%', background: 'var(--bg)',
        border: `2px ${dashed ? 'dashed' : 'solid'} var(--border)`,
        borderRadius: 'var(--radius)', padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', transition: 'all 0.15s', marginBottom: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--blue-light)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = dashed ? 'var(--border)' : 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
    >
      <div style={{
        width: 52, height: 52, background: 'var(--surface)', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{desc}</div>
      </div>
      {badge && <div style={{ marginRight: 4 }}>{badge}</div>}
      {/* Chevron */}
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}

export function RoleView({ school, loginRole, onSelect, onLogout }) {
  const isAdmin = loginRole === 'admin'
  const { announcement } = useCadence()

  // Friendly greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>

      {/* Announcement banner */}
      <div style={{
        background: announcement ? 'oklch(0.96 0.04 245)' : 'var(--surface)',
        border: `1.5px solid ${announcement ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'flex-start', gap: 8,
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>📣</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' }}>
            Announcement
          </span>
          <span style={{
            fontSize: 13,
            color: announcement ? 'var(--blue)' : 'var(--text-3)',
            fontWeight: announcement ? 600 : 400,
            lineHeight: 1.45, display: 'block', marginTop: 1,
          }}>
            {announcement || 'None for the day. Go out and do awesome things!'}
          </span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{greeting}! 👋</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
              {school.name}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 6, color: 'var(--text-3)' }}>
                {school.code}
              </span>
            </div>
            {/* <div style={{ marginTop: 10 }}>
              <RoleBadge role={isAdmin ? 'admin' : 'staff'} />
            </div> */}
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 12 }}>
              What's your role today?
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10,
              padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: 'var(--text-2)', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ⏏ Log out
          </button>
        </div>

        {/* Role cards */}
        <RoleCard
          icon="🚗"
          title="Pickup Staff"
          desc="I'm outside managing the pickup line"
          onClick={() => onSelect('staff')}
        />
        <RoleCard
          icon="🏫"
          title="Classroom Teacher"
          desc="I'm inside waiting for pickup requests"
          onClick={() => onSelect('teacher')}
        />

        {/* Messenger — admin only */}
        {isAdmin && (
          <RoleCard
            icon="📣"
            title="Messenger"
            desc="Share school-wide pickup announcements with parents and staff"
            onClick={() => onSelect('messenger')}
          />
        )}

        {/* School Setup — admin sees full controls, staff sees student management only */}
        <RoleCard
          icon="⚙️"
          title="School Setup"
          desc={isAdmin ? 'Manage school settings and data' : 'Add classes and manage students'}
          onClick={() => onSelect('admin')}
          dashed
        // badge={isAdmin ? (
        //   <span style={{
        //     fontSize: 11, fontWeight: 700, color: 'var(--purple)',
        //     background: 'var(--purple-light)', padding: '3px 8px', borderRadius: 20,
        //   }}>
        //     Admin Only
        //   </span>
        // ) : undefined}
        />
      </div>
    </div>
  )
}
