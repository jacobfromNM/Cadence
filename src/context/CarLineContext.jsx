// src/context/CarLineContext.jsx
//
// Global state and actions for the entire app.
//
// Currently uses in-memory mock data (VITE_USE_MOCK_DATA=true).
// Each action has a clearly marked "── SUPABASE VERSION ──" comment
// showing the exact swap needed when you wire up a real database.
//
// Data shape (mirrors Supabase tables):
//   schools       { id, name, code, staff_pin_hash, admin_pin_hash }
//   classes       { id, school_id, code, teacher_name }
//   students      { id, school_id, class_id, name }
//   pickup_requests { id, student_id, class_id, school_id, status, requested_at, sent_at, completed_at }
//   absent_today  Set of student ids (resets daily)

import React, { createContext, useContext, useState, useCallback } from 'react'
import { MOCK_CLASSES, MOCK_STUDENTS } from '../lib/mockData'
// import { supabase } from '../lib/supabase'  // ← uncomment when going live

const CarLineCtx = createContext(null)

export function CarLineProvider({ children }) {
  const [classes, setClasses] = useState(MOCK_CLASSES)
  const [students, setStudents] = useState(MOCK_STUDENTS)

  // pickups: { [studentId]: { status, requested_at, sent_at, completed_at } }
  // status progression: null → 'requested' → 'sent' → 'complete'
  const [pickups, setPickups] = useState({})

  // absent: Set of student IDs marked absent today
  const [absent, setAbsent] = useState(new Set())

  // ── Pickup actions ──────────────────────────────────────────

  const requestPickup = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    const { error } = await supabase.from('pickup_requests').insert({
      student_id: studentId,
      class_id: students.find(s => s.id === studentId)?.class_id,
      school_id: 'mesa-elem',
      status: 'requested',
      requested_at: new Date().toISOString(),
    })
    // Real-time subscription in TeacherView will pick up the INSERT automatically.
    // setPickups(p => ({
    //   ...p,
    //   [studentId]: { status: 'requested', requested_at: new Date(), sent_at: null, completed_at: null },
    // }))
  }, [])

  const sendStudent = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('pickup_requests')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('student_id', studentId).eq('status', 'requested')
    // setPickups(p => ({ ...p, [studentId]: { ...p[studentId], status: 'sent', sent_at: new Date() } }))
  }, [])

  const completePickup = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('pickup_requests')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('student_id', studentId).eq('status', 'sent')
    // setPickups(p => ({ ...p, [studentId]: { ...p[studentId], status: 'complete', completed_at: new Date() } }))
  }, [])

  const cancelPickup = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('pickup_requests').delete().eq('student_id', studentId)
    // setPickups(p => { const n = { ...p }; delete n[studentId]; return n })
  }, [])

  // ── Absence actions ─────────────────────────────────────────

  const markAbsent = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('absent_today').upsert({ student_id: studentId, school_id: 'mesa-elem', date: today() })
    // setAbsent(prev => { const n = new Set(prev); n.add(studentId); return n })
    // setPickups(p => { const n = { ...p }; delete n[studentId]; return n })
  }, [])

  const markPresent = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('absent_today').delete().eq('student_id', studentId)
    // setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
  }, [])

  const isAbsent = useCallback((studentId) => absent.has(studentId), [absent])

  // ── Class management ────────────────────────────────────────

  const addClass = useCallback((code, teacherName, schoolId = 'mesa-elem') => {
    const id = code.toLowerCase().replace(/[\s-]+/g, '-') + '-' + Date.now()
    // ── SUPABASE VERSION ──
    const { data } = await supabase.from('classes')
      .insert({ code: code.toUpperCase(), teacher_name: teacherName, school_id: schoolId })
      .select().single()
    return data.id
    // setClasses(p => [...p, { id, school_id: schoolId, code: code.toUpperCase(), teacher_name: teacherName }])
    // return id
  }, [])

  const editClass = useCallback((classId, updates) => {
    // ── SUPABASE VERSION ──
    await supabase.from('classes').update(updates).eq('id', classId)
    // setClasses(p => p.map(c => c.id === classId ? { ...c, ...updates } : c))
  }, [])

  const deleteClass = useCallback((classId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('classes').delete().eq('id', classId)
    // Cascade deletes students + pickups via FK constraints in Supabase
    // const toRemove = students.filter(s => s.class_id === classId).map(s => s.id)
    // setClasses(p => p.filter(c => c.id !== classId))
    // setStudents(p => p.filter(s => s.class_id !== classId))
    // setPickups(p => { const n = { ...p }; toRemove.forEach(id => delete n[id]); return n })
    // setAbsent(prev => { const n = new Set(prev); toRemove.forEach(id => n.delete(id)); return n })
  }, [students])

  // ── Student management ──────────────────────────────────────

  const addStudent = useCallback((name, classId, schoolId = 'mesa-elem') => {
    const id = 's' + Date.now() + Math.random().toString(36).slice(2, 6)
    // ── SUPABASE VERSION ──
    const { data } = await supabase.from('students')
      .insert({ name, class_id: classId, school_id: schoolId })
      .select().single()
    return data.id
    // setStudents(p => [...p, { id, school_id: schoolId, class_id: classId, name }])
    // return id
  }, [])

  const editStudent = useCallback((studentId, updates) => {
    // ── SUPABASE VERSION ──
    await supabase.from('students').update(updates).eq('id', studentId)
    // setStudents(p => p.map(s => s.id === studentId ? { ...s, ...updates } : s))
  }, [])

  const deleteStudent = useCallback((studentId) => {
    // ── SUPABASE VERSION ──
    await supabase.from('students').delete().eq('id', studentId)
    // setStudents(p => p.filter(s => s.id !== studentId))
    // setPickups(p => { const n = { ...p }; delete n[studentId]; return n })
    // setAbsent(prev => { const n = new Set(prev); n.delete(studentId); return n })
  }, [])

  // ── Danger zone ─────────────────────────────────────────────

  const resetClassroomData = useCallback(() => {
    setClasses(MOCK_CLASSES)
    setStudents(MOCK_STUDENTS)
    setPickups({})
    setAbsent(new Set())
  }, [])

  const deleteSchool = useCallback(() => {
    setClasses([])
    setStudents([])
    setPickups({})
    setAbsent(new Set())
  }, [])

  // ── Query helpers ───────────────────────────────────────────

  const getClass = useCallback((id) => classes.find(c => c.id === id), [classes])
  const studentsInClass = useCallback((classId) => students.filter(s => s.class_id === classId), [students])
  const pickupsForClass = useCallback((classId) =>
    students
      .filter(s => s.class_id === classId && pickups[s.id])
      .map(s => ({ student: s, pickup: pickups[s.id] })),
    [students, pickups])
  const activePickups = useCallback(() =>
    students
      .filter(s => pickups[s.id] && pickups[s.id].status !== 'complete')
      .map(s => ({ student: s, pickup: pickups[s.id], cls: getClass(s.class_id) })),
    [students, pickups, getClass])

  // ── Formatting ──────────────────────────────────────────────

  const formatTime = (date) =>
    date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  const avgWaitMinutes = useCallback(() => {
    const completed = Object.values(pickups)
      .filter(p => p.status === 'complete' && p.requested_at && p.completed_at)
      .map(p => (new Date(p.completed_at) - new Date(p.requested_at)) / 60000)
    return completed.length
      ? Math.round(completed.reduce((a, b) => a + b, 0) / completed.length)
      : null
  }, [pickups])

  return (
    <CarLineCtx.Provider value={{
      classes, students, pickups, absent,
      requestPickup, sendStudent, completePickup, cancelPickup,
      markAbsent, markPresent, isAbsent,
      addClass, editClass, deleteClass,
      addStudent, editStudent, deleteStudent,
      resetClassroomData, deleteSchool,
      getClass, studentsInClass, pickupsForClass, activePickups,
      formatTime, avgWaitMinutes,
    }}>
      {children}
    </CarLineCtx.Provider>
  )
}

export const useCarLine = () => useContext(CarLineCtx)
