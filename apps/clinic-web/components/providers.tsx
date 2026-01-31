'use client'

import { LanguageProvider } from '@/contexts/language-context'
import { ToastProvider } from '@/contexts/toast-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  )
}
