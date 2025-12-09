"use client"

import { Menu, LogOut, Bell, Languages } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDate, formatTime } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Array<{ id: string; type: "new-order" | "status-change" | "update" | "completed"; message: string; date: string }>>([])
  const { t, lang } = useI18n()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("carwash:notifications")
      if (raw) setNotifications(JSON.parse(raw))
    } catch {}
    const handler = (e: any) => {
      const detail = e?.detail || {}
      const item = { id: Date.now().toString(), type: detail.type, message: detail.message, date: detail.date || new Date().toISOString() }
      setNotifications((prev) => {
        const next = [item, ...prev].slice(0, 50)
        try { localStorage.setItem("carwash:notifications", JSON.stringify(next)) } catch {}
        return next
      })
    }
    window.addEventListener("app:notify", handler as any)
    return () => window.removeEventListener("app:notify", handler as any)
  }, [])

  const clearNotifications = () => {
    setNotifications([])
    try { localStorage.setItem("carwash:notifications", JSON.stringify([])) } catch {}
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.push('/login')
  }
  const toggleLang = async () => {
    const next = lang === 'en' ? 'es' : 'en'
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      if (meRes.ok) {
        const me = await meRes.json()
        if (me?.id) {
          await fetch(`/api/employees/${me.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: next }) })
        }
      }
    } catch {}
    try {
      localStorage.setItem('settings:language', next)
      document.documentElement.lang = next
    } catch {}
    try { window.dispatchEvent(new Event('i18n:changed')) } catch {}
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => window.dispatchEvent(new Event("sidebar:open"))}
          aria-label={t('header.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h1>
          {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('header.notifications')}
              className="relative border-border bg-muted text-foreground hover:bg-muted hover:text-foreground focus:text-foreground active:text-foreground data-[state=open]:text-foreground focus-visible:ring-0"
            >
              <Bell className="h-5 w-5 !text-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-5 text-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>{t('header.notifications')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">{t('header.noNotifications')}</div>
            ) : (
              <div className="max-h-72 overflow-auto">
                {notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex items-start gap-2 hover:bg-muted focus:bg-muted hover:text-foreground focus:text-foreground">
                    <span className={`inline-flex h-2 w-2 rounded-full mt-1 ${n.type === "completed" ? "bg-success" : n.type === "status-change" ? "bg-warning" : "bg-primary"}`} />
                    <div className="text-sm">
                      <p className="font-medium">{n.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(new Date(n.date))} {formatTime(new Date(n.date))}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearNotifications} className="hover:bg-muted focus:bg-muted">{t('header.clear')}</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleLang}
          aria-label={lang === 'en' ? 'Switch language to Spanish' : 'Cambiar idioma a Inglés'}
          suppressHydrationWarning
          className="border-border bg-muted text-foreground hover:bg-muted hover:text-foreground focus:text-foreground active:text-foreground"
        >
          <Languages className="h-5 w-5 !text-foreground" />
        </Button>
        <Button variant="default" size="icon" onClick={handleLogout} aria-label={t('header.logout')}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
