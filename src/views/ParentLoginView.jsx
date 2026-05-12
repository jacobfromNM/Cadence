// src/views/ParentLoginView.jsx
//
// Parent-facing login screen.
// Parents enter a school code + their student's unique parent_code to log in.
// URL params ?school= and ?student= pre-fill the form (used from QR / share links).

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui'

const MAX_ATTEMPTS  = 5
const LOCKOUT_SECS  = 30

export function ParentLoginView({ onLogin, onBack }) {
  const params = new URLSearchParams(window.location.search)

  const [code,       setCode]       = useState((params.get('school') || '').toUpperCase())
  const [studentCode, setStudentCode] = useState(params.get('student') || '')
  const [err,        setErr]        = useState('')
  const [loading,    setLoading]    = useState(false)
  const [attempts,   setAttempts]   = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [countdown,  setCountdown]  = useState(0)

  // Countdown timer during lockout
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (secs <= 0) { setLockedUntil(null); setCountdown(0) }
      else setCountdown(secs)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [lockedUntil])

  const isLocked = lockedUntil && Date.now() < lockedUntil

  const handleSubmit = async () => {
    if (isLocked || loading) return
    setErr('')

    const upperCode  = code.trim().toUpperCase()
    const parentCode = studentCode.trim()

    if (!upperCode || !parentCode) {
      setErr('Enter your school code and student code.')
      return
    }

    setLoading(true)
    try {
      // Look up school
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .eq('code', upperCode)
        .single()

      if (schoolErr || !schoolData) {
        throw new Error('School code not recognised.')
      }

      // Look up student by parent_code within this school
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolData.id)
        .eq('parent_code', parentCode)
        .maybeSingle()

      if (studentErr || !studentData) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_SECS * 1000)
          setErr(`Too many attempts. Please wait ${LOCKOUT_SECS} seconds.`)
        } else {
          setErr(`Student code not found. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`)
        }
        return
      }

      // Success — pass school + student to parent
      setAttempts(0)
      onLogin({ school: schoolData, studentIds: [studentData.id] })
    } catch (e) {
      setErr(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Logo + header */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🚗</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>Parent Check-In</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
            Log in to notify pickup staff when you're on the way.
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>School Code</label>
            <Input
              mono
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. MESA-ELEM"
              disabled={isLocked || loading}
              style={{ padding: '11px 12px', fontSize: 15 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Student Code</label>
            <Input
              mono
              value={studentCode}
              onChange={e => { setStudentCode(e.target.value.replace(/\D/g, '')); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={10}
              disabled={isLocked || loading}
              style={{ padding: '11px 12px', fontSize: 15, letterSpacing: '0.1em' }}
            />
          </div>

          {err && (
            <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, lineHeight: 1.4 }}>{err}</div>
          )}
          {isLocked && (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Try again in {countdown}s</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLocked || loading || !code || !studentCode}
            style={{
              background: isLocked || loading || !code || !studentCode ? 'var(--blue-mid)' : 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '13px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
              cursor: isLocked || loading || !code || !studentCode ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Checking…' : 'Sign In'}
          </button>
        </div>

        {/* Back to staff login */}
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
        >
          ← Staff / Admin Login
        </button>
      </div>
    </div>
  )
}
