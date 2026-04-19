'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface Ctx {
  open: boolean
  openRegister: () => void
  closeRegister: () => void
  bump: number
  notifySaved: () => void
}

const QuickRegisterCtx = createContext<Ctx | null>(null)

export function QuickRegisterProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [bump, setBump] = useState(0)

  const openRegister = useCallback(() => setOpen(true), [])
  const closeRegister = useCallback(() => setOpen(false), [])
  const notifySaved = useCallback(() => setBump((b) => b + 1), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <QuickRegisterCtx.Provider value={{ open, openRegister, closeRegister, bump, notifySaved }}>
      {children}
    </QuickRegisterCtx.Provider>
  )
}

export function useQuickRegister() {
  const ctx = useContext(QuickRegisterCtx)
  if (!ctx) throw new Error('useQuickRegister must be used within QuickRegisterProvider')
  return ctx
}
