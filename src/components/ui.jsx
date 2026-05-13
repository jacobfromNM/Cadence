// src/components/ui.jsx
//
// Small, reusable UI primitives used across the whole app.
// Keeping these in one file makes it easy to tweak the design system globally.

import React from 'react'
import { useToast } from '../context/ToastContext'

// ── Avatar ─────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  { bg: 'oklch(0.88 0.08 245)', fg: 'oklch(0.45 0.18 245)' },
  { bg: 'oklch(0.88 0.08 150)', fg: 'oklch(0.42 0.16 150)' },
  { bg: 'oklch(0.90 0.08 80)', fg: 'oklch(0.50 0.14 80)' },
  { bg: 'oklch(0.88 0.08 310)', fg: 'oklch(0.45 0.18 310)' },
]

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function Avatar({ name, size = 40 }) {
  const palette = AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: palette.bg, color: palette.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0, fontFamily: 'var(--font-body)',
    }}>
      {initials(name)}
    </div>
  )
}

// ── StatusPill ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  requested: { label: 'Waiting', dot: '🟡', bg: 'var(--yellow-light)', color: 'oklch(0.50 0.13 80)' },
  sent: { label: 'Student Sent', dot: '🔵', bg: 'var(--blue-light)', color: 'var(--blue)' },
  complete: { label: 'Complete', dot: '🟢', bg: 'var(--green-light)', color: 'var(--green)' },
}

export function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.dot} {cfg.label}
    </span>
  )
}

// ── RoleBadge ──────────────────────────────────────────────────
const ROLE_CONFIG = {
  staff: { label: 'Pickup View', bg: 'var(--blue-light)', color: 'var(--blue)' },
  teacher: { label: 'Teacher View', bg: 'var(--green-light)', color: 'var(--green)' },
  admin: { label: 'Settings View', bg: 'var(--purple-light)', color: 'var(--purple)' },
}

export function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.staff
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Toast Layer ────────────────────────────────────────────────
// Render this once at the top of the view tree.
const TOAST_ICONS = { success: '✓', error: '✕', info: 'ℹ' }
const TOAST_STYLES = {
  success: { background: 'var(--green)', color: '#fff' },
  error: { background: 'var(--red)', color: '#fff' },
  info: { background: 'var(--blue)', color: '#fff' },
}

export function ToastLayer() {
  const { toasts } = useToast()
  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      width: 'min(400px, calc(100vw - 32px))',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={t.exiting ? 'toast-exit' : 'toast-enter'}
          style={{
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 14, fontWeight: 600, lineHeight: 1.35,
            boxShadow: '0 4px 24px oklch(0.10 0.05 240 / 0.22)',
            fontFamily: 'var(--font-body)',
            ...TOAST_STYLES[t.type],
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{TOAST_ICONS[t.type]}</span>
          <div>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            {t.sub && <div style={{ fontSize: 12, opacity: 0.88, marginTop: 2 }}>{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, background: 'var(--blue-light)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
      }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── Section Label ──────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      padding: '14px 16px 6px',
      fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────
export function Input({ mono, style, ...props }) {
  return (
    <input
      style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '13px 14px',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        fontSize: 16,
        color: 'var(--text)',
        outline: 'none',
        width: '100%',
        letterSpacing: mono ? '0.06em' : undefined,
        transition: 'border-color 0.15s',
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--blue)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
      {...props}
    />
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────
// Inline confirm block (not a modal) — used for delete/reset actions
export function ConfirmBlock({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div style={{
      background: danger ? 'oklch(0.96 0.04 25)' : 'var(--bg)',
      border: `1.5px solid ${danger ? 'var(--red)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: danger ? 'var(--red)' : 'var(--text)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.4 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 8, padding: '10px', fontFamily: 'var(--font-body)',
            fontSize: 14, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            background: danger ? 'var(--red)' : 'var(--blue)',
            border: 'none', borderRadius: 8, padding: '10px',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            color: '#fff', cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

// ── Search Bar ─────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{
      margin: '12px 16px 0',
      background: value ? 'var(--surface)' : 'var(--bg)',
      border: `2px solid ${value ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 14,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {/* Search icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          border: 'none', background: 'transparent',
          fontFamily: 'var(--font-body)', fontSize: 16,
          color: 'var(--text)', flex: 1, outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      )}
    </div>
  )
}
