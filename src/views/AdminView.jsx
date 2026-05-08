// src/views/AdminView.jsx
//
// School Setup screen — reachable with admin PIN (full access) or staff PIN (students only).
// Admin: add/delete classes, edit class details, reset/delete school.
// Staff: add/remove students within existing classes only.

import React, { useState, useEffect } from 'react'
import { useCarLine } from '../context/CarLineContext'
import { useToast } from '../context/ToastContext'
import { Input, ConfirmBlock, SectionLabel } from '../components/ui'
import { AppShell } from '../components/AppShell'
import { supabase } from '../lib/supabase'

// ── Student add form (one-by-one or paste a list) ─────────────
function StudentAddForm({ classId, classes, onAdded }) {
  const { addStudent } = useCarLine()
  const { showToast }  = useToast()
  const [name, setName]         = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [added, setAdded]       = useState(0)

  const handleOne = async () => {
    if (!name.trim()) return
    try {
      await addStudent(name.trim(), classId)
      setAdded(p => p + 1)
      setName('')
      onAdded?.()
    } catch (e) {
      console.error('addStudent failed:', e)
      showToast({ type: 'error', title: 'Could not add student', sub: 'Check your connection and try again.' })
    }
  }

  const handleBulk = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    let count = 0
    let failed = 0
    for (const line of lines) {
      const [n, cls] = line.split(',').map(s => s.trim())
      const targetId = cls
        ? (classes.find(c => c.code.toLowerCase() === cls.toLowerCase())?.id || classId)
        : classId
      if (n && targetId) {
        try {
          await addStudent(n, targetId)
          count++
        } catch (e) {
          console.error('addStudent failed:', e)
          failed++
        }
      }
    }
    setAdded(p => p + count)
    setBulkText('')
    onAdded?.()
    if (failed > 0) {
      showToast({ type: 'error', title: `${failed} student${failed === 1 ? '' : 's'} could not be added`, sub: 'Check your connection and try again.' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 3, gap: 3 }}>
        {['One by one', 'Paste a list'].map((m, i) => (
          <button key={m} onClick={() => setBulkMode(i === 1)} style={{
            flex: 1, textAlign: 'center', padding: 8, borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: bulkMode === (i === 1) ? 'var(--surface)' : 'transparent',
            color: bulkMode === (i === 1) ? 'var(--blue)' : 'var(--text-3)',
            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}>{m}</button>
        ))}
      </div>

      {!bulkMode ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleOne()}
            placeholder="Student name"
            style={{ padding: '10px 12px', fontSize: 14 }}
          />
          <button onClick={handleOne} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 20, cursor: 'pointer' }}>+</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            className="no-scrollbar"
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"Lily Chen\nMarco Reyes\nAva Park"}
            rows={4}
            style={{
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 8, padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--text)', outline: 'none', resize: 'none', width: '100%',
            }}
          />
          <button onClick={handleBulk} style={{ alignSelf: 'flex-start', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Import All
          </button>
        </div>
      )}
      {added > 0 && (
        <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ {added} student{added !== 1 ? 's' : ''} added</div>
      )}
    </div>
  )
}

// ── Edit class screen ─────────────────────────────────────────
function EditClassScreen({ cls, onBack, isAdmin }) {
  const { classes, studentsInClass, editClass, deleteClass, editStudent, deleteStudent } = useCarLine()
  const { showToast } = useToast()
  const [code, setCode]       = useState(cls.code)
  const [teacher, setTeacher] = useState(cls.teacher_name)
  const [saved, setSaved]     = useState(false)
  const [confirmDelete, setConfirmDelete]           = useState(false)
  const [editingStudent, setEditingStudent]         = useState(null)
  const [confirmDeleteStudent, setConfirmDeleteStu] = useState(null)
  const [, refresh] = useState(0)
  const myStudents = studentsInClass(cls.id)

  const handleSave = () => {
    editClass(cls.id, { code: code.toUpperCase(), teacher_name: teacher })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    showToast({ type: 'success', title: 'Class saved' })
  }

  const card = (children) => (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {children}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
          {cls.code} — {cls.teacher_name}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Class details */}
        {card(
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Class Code</label>
              <Input mono value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Teacher Name</label>
              <Input value={teacher} onChange={e => setTeacher(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <button onClick={handleSave} style={{ background: saved ? 'var(--green)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </>
        )}

        {/* Students list */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Students ({myStudents.length})</div>
          {myStudents.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              {editingStudent?.id === s.id ? (
                <>
                  <Input value={editingStudent.name} onChange={e => setEditingStudent(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, padding: '7px 10px', fontSize: 14 }} autoFocus />
                  <button onClick={() => { editStudent(s.id, { name: editingStudent.name }); setEditingStudent(null) }} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 14, cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditingStudent(null)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 14, cursor: 'pointer', color: 'var(--text-2)' }}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>{s.name}</span>
                  <button onClick={() => setEditingStudent({ id: s.id, name: s.name })} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>Edit</button>
                  {confirmDeleteStudent === s.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { deleteStudent(s.id); setConfirmDeleteStu(null); refresh(r => r + 1); showToast({ type: 'info', title: 'Student removed' }) }} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteStu(null)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteStu(s.id)} style={{ background: 'var(--bg)', border: '1px solid oklch(0.75 0.14 25)', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--red)', fontFamily: 'var(--font-body)' }}>Remove</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add students */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Add Students</div>
          <StudentAddForm classId={cls.id} classes={classes} onAdded={() => refresh(r => r + 1)} />
        </div>

        {/* Danger zone — admin only */}
        {isAdmin && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Danger Zone</div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', background: 'var(--surface)', border: '1.5px solid oklch(0.75 0.14 25)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--red)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🗑️</span>
                <div>
                  <div>Delete Class</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400, marginTop: 1 }}>Removes {cls.code} and all {myStudents.length} students</div>
                </div>
              </button>
            ) : (
              <ConfirmBlock
                title={`Delete ${cls.code}?`}
                message={`This will permanently delete the class and all ${myStudents.length} students in it.`}
                confirmLabel="Delete Class"
                danger
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => { deleteClass(cls.id); onBack(); showToast({ type: 'info', title: `${cls.code} deleted` }) }}
              />
            )}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

// ── Add class wizard ──────────────────────────────────────────
function AddClassWizard({ onBack, onDone }) {
  const { classes, addClass, studentsInClass } = useCarLine()
  const { showToast } = useToast()
  const [step, setStep]           = useState(0)
  const [classCode, setClassCode] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [newClassId, setNewClassId]   = useState(null)
  const [creating, setCreating]       = useState(false)

  const handleCreate = async () => {
    if (!classCode || !teacherName || creating) return
    setCreating(true)
    try {
      const id = await addClass(classCode, teacherName)
      setNewClassId(id)
      setStep(1)
      showToast({ type: 'success', title: `${classCode.toUpperCase()} created!` })
    } catch {
      showToast({ type: 'error', title: 'Could not create class', sub: 'Check your connection and try again.' })
    } finally {
      setCreating(false)
    }
  }

  const stepLabels = ['Class Details', 'Add Students', 'Done']
  const progress = `${step + 1}/${stepLabels.length}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Add a Class</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{progress}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, width: `${(step / (stepLabels.length - 1)) * 100}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {step === 0 && (
          <>
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>Enter the class code and teacher name to get started.</div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Class Code</label>
              <Input mono value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())} placeholder="e.g. KG-A, 3B, 5C" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Teacher Name</label>
              <Input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="e.g. Mrs. Jones" />
            </div>
            <button onClick={handleCreate} disabled={!classCode || !teacherName || creating} style={{ background: classCode && teacherName && !creating ? 'var(--blue)' : 'var(--blue-mid)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: classCode && teacherName && !creating ? 'pointer' : 'default' }}>
              {creating ? 'Creating…' : 'Create Class →'}
            </button>
          </>
        )}
        {step === 1 && newClassId && (() => {
          const addedStudents = studentsInClass(newClassId)
          return (
            <>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Add students to <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{classCode}</span>. You can always add more later.
              </div>
              <StudentAddForm classId={newClassId} classes={classes} />
              {addedStudents.length > 0 && (
                <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
                    Added — {addedStudents.length} student{addedStudents.length !== 1 ? 's' : ''}
                  </div>
                  {addedStudents.map((s, i) => (
                    <div key={s.id} style={{
                      padding: '9px 14px', fontSize: 14, color: 'var(--text)',
                      borderBottom: i < addedStudents.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(2)} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Continue →</button>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>Skip for now</button>
            </>
          )
        })()}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 20, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Class Created!</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{classCode}</span> · {teacherName}
              </div>
            </div>
            <button onClick={onDone} style={{ width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Back to Setup</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Change PINs screen ────────────────────────────────────────
function ChangePinScreen({ school, onBack }) {
  const { updatePins } = useCarLine()
  const { showToast }  = useToast()

  // PINs are stored as bcrypt hashes — we can't recover plaintext, so we track
  // newly-set PINs in plaintext within this session for cross-PIN validation only.
  const [latestAdminPin, setLatestAdminPin] = useState('')
  const [latestStaffPin, setLatestStaffPin] = useState('')

  const [adminNew,     setAdminNew]     = useState('')
  const [adminConfirm, setAdminConfirm] = useState('')
  const [adminError,   setAdminError]   = useState('')
  const [adminSaving,  setAdminSaving]  = useState(false)

  const [staffNew,     setStaffNew]     = useState('')
  const [staffConfirm, setStaffConfirm] = useState('')
  const [staffError,   setStaffError]   = useState('')
  const [staffSaving,  setStaffSaving]  = useState(false)

  const validatePin = (pin, confirm, otherPin, label) => {
    if (!/^\d{4,6}$/.test(pin))        return `${label} must be 4–6 digits`
    if (pin !== confirm)               return 'PINs do not match'
    if (pin === otherPin)              return 'Admin and staff PINs must be different'
    return null
  }

  const handleSaveAdmin = async () => {
    const err = validatePin(adminNew, adminConfirm, latestStaffPin, 'Admin PIN')
    if (err) { setAdminError(err); return }
    setAdminError('')
    setAdminSaving(true)
    try {
      await updatePins({ adminPin: adminNew })
      setLatestAdminPin(adminNew)
      setAdminNew('')
      setAdminConfirm('')
      showToast({ type: 'success', title: 'Admin PIN updated' })
    } catch {
      showToast({ type: 'error', title: 'Could not save PIN', sub: 'Check your connection and try again.' })
    } finally {
      setAdminSaving(false)
    }
  }

  const handleSaveStaff = async () => {
    const err = validatePin(staffNew, staffConfirm, latestAdminPin, 'Staff PIN')
    if (err) { setStaffError(err); return }
    setStaffError('')
    setStaffSaving(true)
    try {
      await updatePins({ staffPin: staffNew })
      setLatestStaffPin(staffNew)
      setStaffNew('')
      setStaffConfirm('')
      showToast({ type: 'success', title: 'Staff PIN updated' })
    } catch {
      showToast({ type: 'error', title: 'Could not save PIN', sub: 'Check your connection and try again.' })
    } finally {
      setStaffSaving(false)
    }
  }

  const card = (children) => (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {children}
    </div>
  )

  const pinField = (label, value, onChange) => (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
      <Input
        type="password"
        mono
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="••••"
        style={{ padding: '10px 12px', fontSize: 14 }}
      />
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Change PINs</div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Admin PIN */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Admin PIN</div>
          {card(
            <>
              {pinField('New PIN', adminNew, setAdminNew)}
              {pinField('Confirm New PIN', adminConfirm, setAdminConfirm)}
              {adminError && <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{adminError}</div>}
              <button
                onClick={handleSaveAdmin}
                disabled={adminSaving}
                style={{ background: adminSaving ? 'var(--blue-mid)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: adminSaving ? 'default' : 'pointer' }}
              >
                {adminSaving ? 'Saving…' : 'Update Admin PIN'}
              </button>
            </>
          )}
        </div>

        {/* Staff PIN */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Staff PIN</div>
          {card(
            <>
              {pinField('New PIN', staffNew, setStaffNew)}
              {pinField('Confirm New PIN', staffConfirm, setStaffConfirm)}
              {staffError && <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{staffError}</div>}
              <button
                onClick={handleSaveStaff}
                disabled={staffSaving}
                style={{ background: staffSaving ? 'var(--blue-mid)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: staffSaving ? 'default' : 'pointer' }}
              >
                {staffSaving ? 'Saving…' : 'Update Staff PIN'}
              </button>
            </>
          )}
        </div>

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

// ── Daily Analytics screen ────────────────────────────────────
function AnalyticsScreen({ onBack }) {
  const { schoolId, absent, classes } = useCarLine()
  const [loading, setLoading]       = useState(true)
  const [pickupRows, setPickupRows] = useState([])
  const [lastFetched, setLastFetched] = useState(null)
  const [fetchError, setFetchError] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('school_id', schoolId)
        .gte('requested_at', todayStart.toISOString())
      if (error) throw error
      setPickupRows(data || [])
      setLastFetched(new Date())
    } catch (e) {
      console.error('Analytics fetch failed:', e)
      setFetchError('Could not load analytics. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  const completed = pickupRows.filter(p => p.status === 'complete')
  const active    = pickupRows.filter(p => p.status !== 'complete')

  const waits = completed
    .filter(p => p.requested_at && p.completed_at)
    .map(p => (new Date(p.completed_at) - new Date(p.requested_at)) / 60000)
  const avgWait = waits.length
    ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
    : null

  const classCounts = {}
  for (const p of pickupRows) {
    if (p.class_id) classCounts[p.class_id] = (classCounts[p.class_id] || 0) + 1
  }
  const topClassEntry = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]
  const busiestClass  = topClassEntry ? classes.find(c => c.id === topClassEntry[0]) : null

  const hourCounts = {}
  for (const p of pickupRows) {
    const h = new Date(p.requested_at).getHours()
    hourCounts[h] = (hourCounts[h] || 0) + 1
  }
  const peakEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
  const peakHour  = peakEntry ? parseInt(peakEntry[0]) : null

  const formatHour = (h) => {
    if (h === null) return '—'
    const d = h % 12 || 12
    return `${d}:00 ${h >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Daily Analytics</div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: loading ? 'default' : 'pointer', color: loading ? 'var(--text-3)' : 'var(--blue)', fontFamily: 'var(--font-body)' }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Reset notice */}
        <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
          <div style={{ fontSize: 12, color: 'var(--blue)', lineHeight: 1.5 }}>
            Data reflects today's activity. Pickup and absence records reset automatically every night at midnight Mountain Time.
          </div>
        </div>

        {lastFetched && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: -4 }}>
            Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {fetchError ? (
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--red)' }}>{fetchError}</div>
            <button onClick={fetchData} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* Main stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Pickups',   value: pickupRows.length,                           color: 'var(--blue)',   bg: 'var(--blue-light)' },
                { label: 'Students Absent', value: absent.size,                                 color: 'var(--red)',    bg: 'oklch(0.97 0.04 25)' },
                { label: 'Completed',       value: completed.length,                            color: 'var(--green)',  bg: 'var(--green-light)' },
                { label: 'Avg Wait Time',   value: avgWait !== null ? `${avgWait}m` : '—',      color: 'var(--text-2)', bg: 'var(--surface)' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius)', padding: '14px 16px', border: '1.5px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1.15, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Active / in-transit */}
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active / In Transit</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Pickups not yet completed</div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: active.length > 0 ? 'var(--blue)' : 'var(--text-3)' }}>{active.length}</div>
            </div>

            {/* Busiest class + peak hour */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Busiest Class</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: busiestClass ? 'var(--font-mono)' : 'inherit' }}>
                  {busiestClass ? busiestClass.code : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {busiestClass ? `${topClassEntry[1]} pickup${topClassEntry[1] !== 1 ? 's' : ''}` : 'No data yet'}
                </div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Peak Hour</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatHour(peakHour)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {peakEntry ? `${peakEntry[1]} pickup${peakEntry[1] !== 1 ? 's' : ''}` : 'No data yet'}
                </div>
              </div>
            </div>

            {pickupRows.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 14 }}>
                No pickup activity recorded yet today.
              </div>
            )}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

// ── AdminView root ────────────────────────────────────────────
export function AdminView({ school, loginRole, viewRole, onLogout }) {
  const { classes, students, resetClassroomData, deleteSchool } = useCarLine()
  const { showToast } = useToast()
  const isAdmin = loginRole === 'admin'
  const [tab]               = useState('setup')
  const [view, setView]     = useState('menu')
  const [selectedClass, setSelectedClass] = useState(null)
  const [confirmReset, setConfirmReset]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (view === 'addClass') return <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}><AddClassWizard onBack={() => setView('menu')} onDone={() => setView('menu')} /></AppShell>
  if (view === 'editingClass' && selectedClass) return <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}><EditClassScreen cls={selectedClass} onBack={() => setView('editClass')} isAdmin={isAdmin} /></AppShell>
  if (view === 'changePin') return <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}><ChangePinScreen school={school} onBack={() => setView('menu')} /></AppShell>
  if (view === 'analytics') return <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}><AnalyticsScreen onBack={() => setView('menu')} /></AppShell>

  if (view === 'editClass') {
    return (
      <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, marginLeft: -6, color: 'var(--blue)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Edit Classes</div>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            {classes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)' }}>No classes yet. Add one first.</div>
            )}
            {classes.map(cls => (
              <div key={cls.id} onClick={() => { setSelectedClass(cls); setView('editingClass') }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{cls.code}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{cls.teacher_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{students.filter(s => s.class_id === cls.id).length} students</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  // Main menu
  const menuItems = [
    { icon: '➕', label: 'Add a Class',      desc: 'Create a new class with teacher and students',      action: () => setView('addClass') },
    { icon: '✏️', label: 'Edit Classes',     desc: 'Update class info, students, or delete a class',    action: () => setView('editClass') },
    ...(isAdmin ? [
      { icon: '📊', label: 'Daily Analytics', desc: "Today's pickups, absences, wait times, and trends", action: () => setView('analytics') },
      { icon: '🔑', label: 'Change PINs',     desc: 'Update admin or staff access PINs',                action: () => setView('changePin') },
    ] : []),
  ]

  return (
    <AppShell school={school} loginRole={loginRole} viewRole={viewRole} tab={tab} onTabChange={() => {}} onLogout={onLogout}>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Classes', value: classes.length, color: 'var(--blue)', bg: 'var(--blue-light)' },
            { label: 'Students', value: students.length, color: 'var(--green)', bg: 'var(--green-light)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius)', padding: '16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1.1, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {menuItems.map(item => (
          <div key={item.label} onClick={item.action} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{item.desc}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}

        {/* Danger zone — admin only */}
        {isAdmin && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Danger Zone</div>

            {confirmReset ? (
              <ConfirmBlock
                title="Reset all classroom data?"
                message="All classes, students, and pickup history will be reset to defaults. School name and PINs are preserved."
                confirmLabel="Yes, Reset"
                danger={false}
                onCancel={() => setConfirmReset(false)}
                onConfirm={() => { resetClassroomData(); setConfirmReset(false); showToast({ type: 'info', title: 'Data reset to defaults' }) }}
              />
            ) : (
              <button onClick={() => setConfirmReset(true)} style={{ width: '100%', background: 'var(--surface)', border: '1.5px solid oklch(0.82 0.10 60)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'oklch(0.50 0.14 50)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🔄</span>
                <div>
                  <div>Reset Classroom Data</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400, marginTop: 1 }}>Resets all classes/students to defaults</div>
                </div>
              </button>
            )}

            {confirmDelete ? (
              <div style={{ marginTop: 10 }}>
                <ConfirmBlock
                  title={`Delete ${school.name}?`}
                  message="This permanently deletes all classes, students, and history. Cannot be undone."
                  confirmLabel="Delete Forever"
                  danger
                  onCancel={() => setConfirmDelete(false)}
                  onConfirm={() => { deleteSchool(); setConfirmDelete(false); onLogout(); showToast({ type: 'error', title: 'School data deleted' }) }}
                />
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', background: 'var(--surface)', border: '1.5px solid oklch(0.75 0.14 25)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--red)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🗑️</span>
                <div>
                  <div>Delete School</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400, marginTop: 1 }}>Permanently removes all school data</div>
                </div>
              </button>
            )}
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>
    </AppShell>
  )
}
