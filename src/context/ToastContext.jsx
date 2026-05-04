// src/context/ToastContext.jsx
//
// Lightweight global toast system.
// Usage anywhere in the tree:
//   const { showToast } = useToast()
//   showToast({ type: 'success', title: 'Done!', sub: 'Optional subtitle' })

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const showToast = useCallback(({ type = 'info', title, sub, duration = 2800 }) => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, type, title, sub, exiting: false }])

    // After duration ms: mark exiting (plays out-animation), then remove
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 240)
    }, duration)

    return id
  }, [])

  return (
    <ToastCtx.Provider value={{ showToast, toasts }}>
      {children}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
