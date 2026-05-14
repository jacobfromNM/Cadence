// src/App.jsx
//
// Top-level component. Manages screen routing and login state.
// Screen flow: login → setup | role → staff | teacher | admin
//
// Login now validates against Supabase (schools table).
// School setup writes a new row to the schools table.
// After login, initSchool() is called to fetch all data and open
// real-time subscriptions for that school.

import React, { useState } from 'react'
import bcrypt from 'bcryptjs'
import { CadenceProvider, useCadence } from './context/CadenceContext'
import { ToastProvider } from './context/ToastContext'
import { ToastLayer } from './components/ui'
import { LoginView } from './views/LoginView'
import { RoleView } from './views/RoleView'
import { StaffView } from './views/StaffView'
import { TeacherView } from './views/TeacherView'
import { AdminView } from './views/AdminView'
import { SetupView } from './views/SetupView'
import { ParentLoginView } from './views/ParentLoginView'
import { ParentView } from './views/ParentView'
import { MessengerView } from './views/MessengerView'
import { supabase } from './lib/supabase'

// ── Inner app — needs access to CadenceProvider context ───────
function InnerApp() {
  const { initSchool, clearSchool, loading } = useCadence()

  // If URL has ?school= and ?student= params, jump straight to parent login
  const urlParams   = new URLSearchParams(window.location.search)
  const hasParentUrl = urlParams.has('school') && urlParams.has('student')

  const [screen,      setScreen]      = useState(hasParentUrl ? 'parentLogin' : 'login')
  const [loginRole,   setLoginRole]   = useState(null)   // 'staff' | 'admin' — the PIN used to log in
  const [viewRole,    setViewRole]    = useState(null)   // 'staff' | 'teacher' | 'admin' — which view was selected
  const [school,      setSchool]      = useState(null)
  const [authError,   setAuthError]   = useState('')
  // Parent session state
  const [parentSchool,     setParentSchool]     = useState(null)
  const [parentStudentIds, setParentStudentIds] = useState([])

  // Called by LoginView after the user enters a school code + PIN.
  // Looks up the school in Supabase and validates the PIN.
  const handleLogin = async (code, pin) => {
    setAuthError('')
    const upperCode = code.trim().toUpperCase()

    const { data: schoolData, error } = await supabase
      .from('schools')
      .select('*')
      .eq('code', upperCode)
      .single()

    if (error || !schoolData) {
      return { error: 'School code not recognised. Check with your administrator.' }
    }

    // PIN check — bcrypt.compare handles both hashed and any legacy plain-text values
    let role = null
    const [isAdmin, isStaff] = await Promise.all([
      bcrypt.compare(pin, schoolData.admin_pin_hash),
      bcrypt.compare(pin, schoolData.staff_pin_hash),
    ])
    if (isAdmin)      role = 'admin'
    else if (isStaff) role = 'staff'

    if (!role) {
      return { error: 'Incorrect PIN. Check with your school administrator.' }
    }

    // Fetch all data for this school and open real-time subscriptions
    await initSchool(schoolData.id)

    setLoginRole(role)
    setSchool(schoolData)
    setScreen('role')
    return { error: null }
  }

  // Called by SetupView when the wizard completes.
  // Inserts the new school into Supabase, then logs in as admin.
  const handleSetupComplete = async ({ staffPin, adminPin, school: newSchool }) => {
    setAuthError('')

    // Check the code isn't already taken
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('code', newSchool.code)
      .single()

    if (existing) {
      return { error: `School code "${newSchool.code}" is already in use. Choose a different code.` }
    }

    // REQUIRES SERVICE ROLE after RLS tightening — move to Edge Function in Phase 2
    const { data: inserted, error } = await supabase
      .from('schools')
      .insert({
        name:            newSchool.name,
        code:            newSchool.code,
        staff_pin_hash:  staffPin,
        admin_pin_hash:  adminPin,
      })
      .select()
      .single()

    if (error) {
      console.error('School insert failed:', error)
      return { error: 'Could not create school. Please try again.' }
    }

    // Initialise context for the new school (no classes/students yet)
    await initSchool(inserted.id)

    setLoginRole('admin')
    setSchool(inserted)
    setScreen('role')
    return { error: null }
  }

  const handleRoleSelect = (role) => {
    setViewRole(role)
    setScreen(role)
  }

  const handleLogout = () => {
    clearSchool()
    setScreen('login')
    setLoginRole(null)
    setViewRole(null)
    setSchool(null)
  }

  // Parent login — no initSchool needed; parent view fetches only what it needs
  const handleParentLogin = ({ school: s, studentIds }) => {
    setParentSchool(s)
    setParentStudentIds(studentIds)
    setScreen('parent')
  }

  const handleParentLogout = () => {
    setParentSchool(null)
    setParentStudentIds([])
    setScreen('parentLogin')
  }

  const handleBackToRole = () => setScreen('role')

  return (
    <>
      <ToastLayer />

      {screen === 'login' && (
        <LoginView
          onLogin={handleLogin}
          onCreateSchool={() => setScreen('setup')}
          onParentLogin={() => setScreen('parentLogin')}
        />
      )}

      {screen === 'parentLogin' && (
        <ParentLoginView
          onLogin={handleParentLogin}
          onBack={() => setScreen('login')}
        />
      )}

      {screen === 'parent' && parentSchool && (
        <ParentView
          school={parentSchool}
          initialStudentIds={parentStudentIds}
          onLogout={handleParentLogout}
        />
      )}

      {screen === 'setup' && (
        <SetupView
          onComplete={handleSetupComplete}
          onBack={() => setScreen('login')}
        />
      )}

      {screen === 'role' && school && (
        <RoleView
          school={school}
          loginRole={loginRole}
          onSelect={handleRoleSelect}
          onLogout={handleLogout}
        />
      )}

      {screen === 'staff' && school && (
        <StaffView
          school={school}
          loginRole={loginRole}
          viewRole={viewRole}
          onLogout={handleBackToRole}
        />
      )}

      {screen === 'teacher' && school && (
        <TeacherView
          school={school}
          loginRole={loginRole}
          viewRole={viewRole}
          onLogout={handleBackToRole}
        />
      )}

      {screen === 'admin' && school && (
        <AdminView
          school={school}
          loginRole={loginRole}
          viewRole={viewRole}
          onLogout={handleBackToRole}
          onSchoolDelete={handleLogout}
        />
      )}

      {screen === 'messenger' && school && (
        <MessengerView
          school={school}
          onLogout={handleBackToRole}
        />
      )}
    </>
  )
}

// ── Root — wraps providers around InnerApp ────────────────────
export default function App() {
  return (
    <CadenceProvider>
      <ToastProvider>
        <InnerApp />
      </ToastProvider>
    </CadenceProvider>
  )
}
