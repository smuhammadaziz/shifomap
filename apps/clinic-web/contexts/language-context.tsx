'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import content from '@/lib/content.json'

export type Language = 'uz' | 'ru'

type Content = typeof content.uz

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: Content
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'clinic-language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uz')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null
    if (stored === 'uz' || stored === 'ru') {
      setLanguageState(stored)
    }
    setMounted(true)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }, [])

  const t = content[language] as Content

  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: 'uz',
          setLanguage,
          t: content.uz as Content,
        }}
      >
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
