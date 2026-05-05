// src/views/LoginView.jsx
// Login is now async — onLogin(code, pin) returns { error } from App.jsx
// which validates against the Supabase schools table.

import React, { useState } from 'react'
import { Input } from '../components/ui'

export function LoginView({ onLogin, onCreateSchool }) {
  const [code,    setCode]    = useState('')
  const [pin,     setPin]     = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!code || !pin) { setErr('Please enter your school code and PIN.'); return }
    setLoading(true)
    setErr('')

    const { error } = await onLogin(code, pin)

    if (error) {
      setErr(error)
      setLoading(false)
    }
    // On success App.jsx changes the screen — no action needed here
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)',
        borderRadius: 24,
        border: '1px solid var(--border)',
        padding: '40px 32px',
        boxShadow: '0 8px 40px oklch(0.10 0.05 240 / 0.10)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, background: 'var(--blue)', borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M6 26l7-14 7 8 5-6 9 12H6z" fill="white" opacity="0.9"/>
              <circle cx="32" cy="10" r="4" fill="white" opacity="0.6"/>
            </svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>CarLine</div>
          <div style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 4 }}>School pickup, simplified.</div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              School Code
            </label>
            <Input
              mono
              placeholder="e.g. MESA-ELEM"
              value={code}
              onChange={e => { setCode(e.target.value); setErr('') }}
              onKeyDown={handleKeyDown}
              style={{ textTransform: 'uppercase' }}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              PIN
            </label>
            <Input
              mono
              type="password"
              placeholder="••••"
              value={pin}
              onChange={e => { setPin(e.target.value); setErr('') }}
              onKeyDown={handleKeyDown}
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          {err && (
            <div style={{
              fontSize: 13, color: 'var(--red)', fontWeight: 500,
              padding: '8px 12px', background: 'var(--red-light)', borderRadius: 8,
            }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? 'var(--blue-mid)' : 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius)',
              padding: '15px', fontFamily: 'var(--font-body)',
              fontSize: 16, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.15s', marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>

        {/* New school link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>New to CarLine?&nbsp;</span>
          <button
            onClick={onCreateSchool}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, fontWeight: 600, color: 'var(--blue)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Set up your school
          </button>
        </div>
      </div>
    </div>
  )
}
