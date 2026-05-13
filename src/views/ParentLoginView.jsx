// src/views/ParentLoginView.jsx
//
// Parent-facing login screen — matches the staff/admin LoginView card style.
// URL params ?school= and ?student= pre-fill the form (used from QR / share links).

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui'
import privacyContent from '../../privacy-disclosure.md?raw'

// ---------------------------------------------------------------------------
// Shared inline markdown renderer (subset used in privacy-disclosure.md)
// ---------------------------------------------------------------------------

function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link)
      return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--blue)', textDecoration: 'underline' }}>{link[1]}</a>
    return part
  })
}

function MarkdownContent({ md }) {
  const lines = md.split('\n')
  const elements = []
  let i = 0
  const h1Style = { fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }
  const h2Style = { fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '18px 0 6px' }
  const pStyle  = { fontSize: 13, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.6 }
  const hrStyle = { border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }
  const liStyle = { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }
  const ulStyle = { margin: '0 0 8px', paddingLeft: 20 }
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('# '))       elements.push(<h1 key={i} style={h1Style}>{parseInline(line.slice(2))}</h1>)
    else if (line.startsWith('## ')) elements.push(<h2 key={i} style={h2Style}>{parseInline(line.slice(3))}</h2>)
    else if (line === '---')         elements.push(<hr key={i} style={hrStyle} />)
    else if (line.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(<li key={i} style={liStyle}>{parseInline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} style={ulStyle}>{items}</ul>)
      continue
    } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**'))
      elements.push(<p key={i} style={{ ...pStyle, fontStyle: 'italic' }}>{line.slice(1, -1)}</p>)
    else if (line.trim() !== '')
      elements.push(<p key={i} style={pStyle}>{parseInline(line)}</p>)
    i++
  }
  return <>{elements}</>
}

function PrivacyModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'oklch(0.10 0.05 240 / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '80dvh', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 64px oklch(0.10 0.05 240 / 0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Data &amp; Privacy Disclosure</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: '2px 6px', borderRadius: 6, fontFamily: 'var(--font-body)' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', flex: 1 }}>
          <MarkdownContent md={privacyContent} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5
const LOCKOUT_SECS = 30

export function ParentLoginView({ onLogin, onBack }) {
  const params = new URLSearchParams(window.location.search)

  const [code,        setCode]        = useState((params.get('school') || '').toUpperCase())
  const [studentCode, setStudentCode] = useState(params.get('student') || '')
  const [err,         setErr]         = useState('')
  const [loading,     setLoading]     = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [countdown,   setCountdown]   = useState(0)

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

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil)

  const displayErr = isLocked
    ? `Too many attempts. Try again in ${countdown} second${countdown === 1 ? '' : 's'}.`
    : err

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
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools').select('*').eq('code', upperCode).single()

      if (schoolErr || !schoolData) throw new Error('School code not recognised.')

      const { data: studentData, error: studentErr } = await supabase
        .from('students').select('*')
        .eq('school_id', schoolData.id).eq('parent_code', parentCode).maybeSingle()

      if (studentErr || !studentData) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_SECS * 1000)
        } else {
          const rem = MAX_ATTEMPTS - next
          setErr(`Student code not found. ${rem} attempt${rem !== 1 ? 's' : ''} remaining.`)
        }
        return
      }

      setAttempts(0)
      onLogin({ school: schoolData, studentIds: [studentData.id] })
    } catch (e) {
      setErr(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}

      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', padding: '40px 32px', boxShadow: '0 8px 40px oklch(0.10 0.05 240 / 0.10)' }}>

          {/* Logo — identical to staff/admin login */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 16, overflow: 'hidden' }}>
              <img src="/icon-192.png" alt="CarLine" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>CarLine</div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 4 }}>School pickup, simplified.</div>
            <div style={{ marginTop: 10, background: 'var(--blue-light)', color: 'var(--blue)', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.04em' }}>
              Parent Login Portal
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>School Code</label>
              <Input
                mono
                placeholder="e.g. MESA-ELEM"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                disabled={isLocked || loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Student Code</label>
              <Input
                mono
                placeholder="6-digit code"
                value={studentCode}
                onChange={e => { setStudentCode(e.target.value.replace(/\D/g, '')); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                inputMode="numeric"
                maxLength={10}
                disabled={isLocked || loading}
                style={{ letterSpacing: '0.1em' }}
              />
            </div>

            {displayErr && (
              <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, padding: '8px 12px', background: 'var(--red-light)', borderRadius: 8 }}>
                {displayErr}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLocked || loading || !code || !studentCode}
              style={{
                background: isLocked || loading || !code || !studentCode ? 'var(--blue-mid)' : 'var(--blue)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                padding: '15px', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                cursor: isLocked || loading || !code || !studentCode ? 'default' : 'pointer',
                transition: 'background 0.15s', marginTop: 4,
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>

          {/* Privacy link */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => setPrivacyOpen(true)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Data &amp; Privacy Disclosure
            </button>
          </div>

          {/* Staff/Admin login link */}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Staff / Admin Login →
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
