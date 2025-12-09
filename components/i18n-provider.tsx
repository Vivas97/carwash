"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { getDict, type I18nDict } from "@/lib/i18n"

type I18nContextValue = {
  lang: string
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue>({ lang: "es", t: (k) => k })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<string>('es')

  useEffect(() => {
    ;(async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
        if (meRes.ok) {
          const me = await meRes.json()
          const l1 = me?.language === 'en' ? 'en' : 'es'
          setLang(l1)
          try {
            localStorage.setItem('settings:language', l1)
            document.documentElement.lang = l1
          } catch {}
          try { window.dispatchEvent(new Event('i18n:changed')) } catch {}
          return
        }
      } catch {}
      // No fallback to Settings language; language is per-employee or localStorage
    })()
  }, [])

  useEffect(() => {
    const handler = () => {
      try {
        const l = localStorage.getItem('settings:language') || 'es'
        setLang(l === 'en' ? 'en' : 'es')
        document.documentElement.lang = l
      } catch {}
    }
    window.addEventListener('settings:updated', handler as EventListener)
    window.addEventListener('i18n:changed', handler as EventListener)
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === 'settings:language' && e.newValue) {
        const l = e.newValue
        setLang(l === 'en' ? 'en' : 'es')
        document.documentElement.lang = l
      }
    })
    return () => window.removeEventListener('settings:updated', handler as EventListener)
  }, [])

  const dict: I18nDict = useMemo(() => getDict(lang), [lang])
  const t = useMemo(() => (key: string, fallback?: string) => dict[key] ?? fallback ?? key, [dict])

  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
