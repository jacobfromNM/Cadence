// src/components/AppShell.jsx
//
// The top-level layout wrapper.
//
// Phone  (<640px):  Full-screen single column. Bottom nav bar.
// Tablet (≥640px):  Sidebar (240px) + main panel side by side.
// Desktop(≥1024px): Wider sidebar (280px) + main panel, more padding.
//
// The sidebar shows the school name, active role badge, and nav links.
// On mobile the sidebar collapses into a bottom tab bar.

import React, { useState, useEffect } from 'react'
import { RoleBadge } from './ui'
import { useCadence } from '../context/CadenceContext'

// ── Nav icons ─────────────────────────────────────────────────
function IconStudents() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconActive() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconClasses() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
function IconQueue() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

function useIsWide() {
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 640)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isWide
}

export function AppShell({ school, loginRole, viewRole, tab, onTabChange, onLogout, children }) {
  const isWide = useIsWide()
  const { activePickups } = useCadence()
  const activePending = activePickups().length

  // viewRole reflects the selected view ('staff' | 'teacher' | 'admin')
  // loginRole reflects the PIN used ('staff' | 'admin') — used for access gating only
  const effectiveRole = viewRole || loginRole

  // Build nav items based on the active view role
  const navItems = effectiveRole === 'teacher'
    ? [
        { id: 'queue', label: 'Queue', Icon: IconQueue },
      ]
    : [
        { id: 'students', label: 'Students', Icon: IconStudents },
        { id: 'active',   label: 'Active',   Icon: IconActive,  badge: activePending },
        { id: 'classes',  label: 'Classes',  Icon: IconClasses },
        ...(effectiveRole === 'admin'
          ? [{ id: 'setup', label: 'Setup', Icon: IconSettings }]
          : []),
      ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: isWide ? 'row' : 'column',
      height: '100dvh',          // dvh = dynamic viewport height, handles mobile browser chrome
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* ── Sidebar (tablet+) ───────────────────────────────── */}
      {isWide && (
        <aside style={{
          width: window.innerWidth >= 1024 ? 280 : 240,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          overflow: 'hidden',
        }}>
          {/* Logo / school name */}
          <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img
                src="/favicon.png"
                alt="Cadence"
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Cadence</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {school.code}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, marginBottom: 8 }}>{school.name}</div>
            <RoleBadge role={effectiveRole} />
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(item => {
              const isActive = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isActive ? 'var(--blue-light)' : 'transparent',
                    color: isActive ? 'var(--blue)' : 'var(--text-2)',
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.15s', textAlign: 'left', position: 'relative',
                  }}
                >
                  <item.Icon />
                  {item.label}
                  {item.badge > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--yellow)',
                      color: 'oklch(0.25 0.05 80)', fontSize: 11, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 20,
                    }}>{item.badge}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Back to home */}
          <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-3)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                width: '100%', transition: 'all 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><polyline points="15 18 9 12 15 6"/></svg>
              Home
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content area ───────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile-only top bar */}
        {!isWide && (
          <div style={{
            padding: '14px 16px 12px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{school.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{school.code}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RoleBadge role={effectiveRole} />
              <button
                onClick={onLogout}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Page content (scrollable) */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>

        {/* ── Bottom tab bar (mobile only) ──────────────────── */}
        {!isWide && (
          <div style={{
            display: 'flex',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            flexShrink: 0,
          }}>
            {navItems.map(item => {
              const isActive = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '10px 4px 8px', cursor: 'pointer', border: 'none',
                    background: 'transparent',
                    color: isActive ? 'var(--blue)' : 'var(--text-3)',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
                    fontFamily: 'var(--font-body)', transition: 'color 0.15s',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <item.Icon />
                    {item.badge > 0 && (
                      <div style={{
                        position: 'absolute', top: -2, right: -4,
                        background: 'var(--yellow)', color: 'oklch(0.25 0.05 80)',
                        fontSize: 9, fontWeight: 800, padding: '1px 5px',
                        borderRadius: 10, minWidth: 16, textAlign: 'center',
                      }}>{item.badge}</div>
                    )}
                  </div>
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
