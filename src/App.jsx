// src/App.jsx
//
// Top-level component. Manages which screen is active and holds login state.
// Screen flow:
//   login → role → staff | teacher | admin (setup)
//
// All data lives in CarLineProvider (context/CarLineContext.jsx).
// Toasts live in ToastProvider (context/ToastContext.jsx).

import React, { useState } from 'react'
import { CarLineProvider } from './context/CarLineContext'
import { ToastProvider } from './context/ToastContext'
import { ToastLayer } from './components/ui'
import { LoginView } from './views/LoginView'
import { RoleView } from './views/RoleView'
import { StaffView } from './views/StaffView'
import { TeacherView } from './views/TeacherView'
import { AdminView } from './views/AdminView'

// Screen names match the role selected in RoleView
// 'login' → 'role' → 'staff' | 'teacher' | 'admin'

export default function App() {
  const [screen, setScreen]       = useState('login')
  const [loginRole, setLoginRole] = useState(null)   // 'staff' | 'admin'
  const [school, setSchool]       = useState(null)

  const handleLogin = (role, schoolData) => {
    setLoginRole(role)
    setSchool(schoolData)
    setScreen('role')
  }

  const handleRoleSelect = (role) => {
    setScreen(role)  // 'staff' | 'teacher' | 'admin'
  }

  const handleLogout = () => {
    setScreen('login')
    setLoginRole(null)
    setSchool(null)
  }

  const handleBackToRole = () => {
    setScreen('role')
  }

  return (
    <CarLineProvider>
      <ToastProvider>
        {/* Global toast layer — floats above everything */}
        <ToastLayer />

        {screen === 'login' && (
          <LoginView onLogin={handleLogin} />
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
            onLogout={handleBackToRole}
          />
        )}

        {screen === 'teacher' && school && (
          <TeacherView
            school={school}
            loginRole={loginRole}
            onLogout={handleBackToRole}
          />
        )}

        {screen === 'admin' && school && (
          <AdminView
            school={school}
            loginRole={loginRole}
            onLogout={handleBackToRole}
          />
        )}
      </ToastProvider>
    </CarLineProvider>
  )
}
