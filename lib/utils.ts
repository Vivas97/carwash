import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function currentLang() {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('settings:language') : null
    const docLang = typeof document !== 'undefined' ? document.documentElement.lang : undefined
    const l = (stored || docLang || 'es').toLowerCase()
    return l === 'en' ? 'en-US' : 'es-CO'
  } catch {
    return 'es-CO'
  }
}

function currentCurrency() {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('settings:currency') : null
    if (stored === 'USD' || stored === 'COP') return stored
    const l = typeof window !== 'undefined' ? localStorage.getItem('settings:language') : null
    return l === 'en' ? 'USD' : 'COP'
  } catch {
    return 'COP'
  }
}

export function formatCurrency(
  amount: number,
  locale?: string,
  currency?: string,
  options?: Intl.NumberFormatOptions,
) {
  const loc = locale || currentLang()
  const cur = currency || currentCurrency()
  return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, ...options }).format(amount)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(currentLang(), { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat(currentLang(), { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(currentLang(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
