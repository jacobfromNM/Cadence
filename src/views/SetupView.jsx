// src/views/SetupView.jsx
// 3-step onboarding wizard: School Info → Set PINs → Review & Create
//
// onComplete is now async (writes to Supabase via App.jsx).
// If the school code is already taken, the error is shown inline on step 3.

import React, { useState, useRef } from 'react'
import bcrypt from 'bcryptjs'
import { Input } from '../components/ui'

const STEP_LABELS = ['School Info', 'Set PINs', 'Review']

function deriveCode(name) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.slice(0, 4))
    .join('-')
    .slice(0, 15) || ''
}

export function SetupView({ onComplete, onBack }) {
  const [step, setStep]       = useState(0)
  const [err,  setErr]        = useState('')
  const [saving, setSaving]   = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const codeWasEdited = useRef(false)

  const [adminPin,        setAdminPin]        = useState('')
  const [adminPinConfirm, setAdminPinConfirm] = useState('')
  const [staffPin,        setStaffPin]        = useState('')
  const [staffPinConfirm, setStaffPinConfirm] = useState('')

  const handleNameChange = (val) => {
    setSchoolName(val)
    if (!codeWasEdited.current) setSchoolCode(deriveCode(val))
  }

  const handleCodeChange = (val) => {
    setSchoolCode(val.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
    codeWasEdited.current = true
  }

  const validateStep1 = () => {
    if (!schoolName.trim())    { setErr('Please enter your school name.'); return false }
    if (!schoolCode)           { setErr('Please enter a school code.'); return false }
    if (schoolCode.length < 2) { setErr('School code must be at least 2 characters.'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!/^\d{4,6}$/.test(adminPin))  { setErr('Admin PIN must be 4–6 digits.'); return false }
    if (adminPin !== adminPinConfirm)  { setErr('Admin PINs do not match.'); return false }
    if (!/^\d{4,6}$/.test(staffPin))  { setErr('Staff PIN must be 4–6 digits.'); return false }
    if (staffPin !== staffPinConfirm)  { setErr('Staff PINs do not match.'); return false }
    if (adminPin === staffPin)         { setErr('Admin and staff PINs must be different.'); return false }
    return true
  }

  const handleNext = async () => {
    setErr('')
    if (step === 0) { if (validateStep1()) setStep(1) }
    else if (step === 1) { if (validateStep2()) setStep(2) }
    else {
      // Step 3 — hash PINs then write to Supabase
      setSaving(true)
      try {
        const [hashedAdminPin, hashedStaffPin] = await Promise.all([
          bcrypt.hash(adminPin, 10),
          bcrypt.hash(staffPin, 10),
        ])
        const school = {
          name: schoolName.trim(),
          code: schoolCode,
          staff_pin_hash: hashedStaffPin,
          admin_pin_hash: hashedAdminPin,
        }
        const result = await onComplete({ staffPin: hashedStaffPin, adminPin: hashedAdminPin, school })
        // onComplete returns { error } if something went wrong (e.g. duplicate code)
        if (result?.error) {
          setErr(result.error)
          setSaving(false)
        }
        // On success App.jsx changes the screen — nothing to do here
      } catch {
        setErr('An error occurred while securing your PINs. Please try again.')
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    setErr('')
    if (step === 0) onBack()
    else setStep(s => s - 1)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleNext() }

  const reviewRows = [
    { label: 'School Name', value: schoolName },
    { label: 'School Code', value: schoolCode, mono: true },
    { label: 'Admin PIN',   value: '•'.repeat(adminPin.length) },
    { label: 'Staff PIN',   value: '•'.repeat(staffPin.length) },
  ]

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--blue)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M6 26l7-14 7 8 5-6 9 12H6z" fill="white" opacity="0.9"/>
              <circle cx="32" cy="10" r="4" fill="white" opacity="0.6"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Set Up Your School</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
            Step {step + 1} of 3 — {STEP_LABELS[step]}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEP_LABELS.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: 1, borderRadius: 2,
              background: i <= step ? 'var(--blue)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {/* Step 1: School Info */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                School Name
              </label>
              <Input
                placeholder="e.g. Mesa Elementary"
                value={schoolName}
                onChange={e => { handleNameChange(e.target.value); setErr('') }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                School Code
              </label>
              <Input
                mono
                placeholder="e.g. MESA-ELEM"
                value={schoolCode}
                onChange={e => { handleCodeChange(e.target.value); setErr('') }}
                onKeyDown={handleKeyDown}
                autoCapitalize="characters"
                autoCorrect="off"
                maxLength={15}
              />
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>
                Staff and admins use this code to sign in.
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Set PINs */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Admin PIN</div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>PIN</label>
              <Input mono type="password" placeholder="4–6 digits"
                value={adminPin}
                onChange={e => { setAdminPin(e.target.value.replace(/\D/g, '')); setErr('') }}
                onKeyDown={handleKeyDown}
                maxLength={6} inputMode="numeric" autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>Confirm PIN</label>
              <Input mono type="password" placeholder="••••"
                value={adminPinConfirm}
                onChange={e => { setAdminPinConfirm(e.target.value.replace(/\D/g, '')); setErr('') }}
                onKeyDown={handleKeyDown}
                maxLength={6} inputMode="numeric"
              />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Staff PIN</div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>PIN</label>
                <Input mono type="password" placeholder="4–6 digits"
                  value={staffPin}
                  onChange={e => { setStaffPin(e.target.value.replace(/\D/g, '')); setErr('') }}
                  onKeyDown={handleKeyDown}
                  maxLength={6} inputMode="numeric"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>Confirm PIN</label>
                <Input mono type="password" placeholder="••••"
                  value={staffPinConfirm}
                  onChange={e => { setStaffPinConfirm(e.target.value.replace(/\D/g, '')); setErr('') }}
                  onKeyDown={handleKeyDown}
                  maxLength={6} inputMode="numeric"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>
              Review your details before creating.
            </div>
            {reviewRows.map(({ label, value, mono }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'var(--bg)', borderRadius: 10,
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                }}>{value}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              You'll be taken to School Setup to add classrooms and students.
            </div>
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{
            fontSize: 13, color: 'var(--red)', fontWeight: 500,
            padding: '8px 12px', background: 'var(--red-light)', borderRadius: 8, marginTop: 14,
          }}>
            {err}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <button
            onClick={handleNext}
            disabled={saving}
            style={{
              background: saving ? 'var(--blue-mid)' : 'var(--blue)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius)', padding: '15px',
              fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Creating…' : step === 2 ? 'Create School' : 'Continue →'}
          </button>
          <button
            onClick={handleBack}
            disabled={saving}
            style={{
              background: 'none', color: 'var(--text-2)', border: 'none',
              padding: '8px', fontSize: 14, cursor: saving ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            ← {step === 0 ? 'Back to sign in' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  )
}
