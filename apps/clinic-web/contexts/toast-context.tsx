'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error'

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [type, setType] = useState<ToastType>('success')
  const [mounted, setMounted] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toast = useCallback((msg: string, toastType: ToastType = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setMessage(msg)
    setType(toastType)
    timeoutRef.current = setTimeout(() => {
      setMessage(null)
      timeoutRef.current = null
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && typeof document !== 'undefined' && message &&
        createPortal(
          <div
            className="fixed max-w-sm rounded-xl border-2 px-4 py-3 shadow-xl"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 99999,
              ...(type === 'success'
                ? { borderColor: 'rgb(134 239 172)', backgroundColor: 'rgb(240 253 244)', color: 'rgb(20 83 45)' }
                : { borderColor: 'rgb(252 165 165)', backgroundColor: 'rgb(254 226 226)', color: 'rgb(127 29 29)' }),
            }}
            role="alert"
          >
            <p className="text-sm font-semibold">{message}</p>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toast: (_message: string, _type?: ToastType) => {},
    }
  }
  return ctx
}
