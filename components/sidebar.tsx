"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
import { LayoutDashboard, Car, Users, Wrench, FileBarChart, Settings, ChevronLeft, ChevronRight, ListChecks, MapPin, Barcode, Tag, ListTree } from "lucide-react"
import { useEffect, useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Órdenes", href: "/orders", icon: ListChecks },
  { name: "Vehículos", href: "/vehicles", icon: Car },
  { name: "Escáner", href: "/scanner", icon: Barcode },
  { name: "Empleados", href: "/employees", icon: Users },
  { name: "Servicios", href: "/services", icon: Wrench },
  { name: "Marcas", href: "/brands", icon: Tag },
  { name: "Modelos", href: "/models", icon: ListTree },
  { name: "Ubicaciones", href: "/locations", icon: MapPin },
  { name: "Reportes", href: "/reports", icon: FileBarChart },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [companyName, setCompanyName] = useState<string>("")

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const updateMobile = () => setIsMobile(mq.matches)
    updateMobile()
    mq.addEventListener("change", updateMobile)

    // estilo inicial dependerá de estado actual
    document.documentElement.style.setProperty("--sidebar-width", mq.matches ? "0rem" : collapsed ? "4rem" : "16rem")

    const onOpen = () => setCollapsed(false)
    const onClose = () => setCollapsed(true)
    const onToggle = () => setCollapsed((c) => !c)
    window.addEventListener("sidebar:open", onOpen as EventListener)
    window.addEventListener("sidebar:close", onClose as EventListener)
    window.addEventListener("sidebar:toggle", onToggle as EventListener)

    return () => {
      mq.removeEventListener("change", updateMobile)
      window.removeEventListener("sidebar:open", onOpen as EventListener)
      window.removeEventListener("sidebar:close", onClose as EventListener)
      window.removeEventListener("sidebar:toggle", onToggle as EventListener)
    }
  }, [collapsed])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar:collapsed") === "true"
      setCollapsed(saved)
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (res.ok) setUser(await res.json())
        else setUser(null)
      } catch { setUser(null) }
    })()
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setCompanyName(data?.companyName || "")
        }
      } catch {}
    }
    loadSettings()
    const onUpdated = () => loadSettings()
    window.addEventListener('settings:updated', onUpdated as EventListener)
    return () => window.removeEventListener('settings:updated', onUpdated as EventListener)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar:collapsed", String(collapsed))
    document.documentElement.style.setProperty("--sidebar-width", isMobile ? "0rem" : collapsed ? "4rem" : "16rem")
  }, [collapsed, isMobile])

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [pathname, isMobile])

  const { t, lang } = useI18n()
  const items = [
    { key: 'nav.dashboard', href: '/', icon: LayoutDashboard },
    { key: 'nav.orders', href: '/orders', icon: ListChecks },
    { key: 'nav.vehicles', href: '/vehicles', icon: Car },
    { key: 'nav.scanner', href: '/scanner', icon: Barcode },
    { key: 'nav.employees', href: '/employees', icon: Users },
    { key: 'nav.services', href: '/services', icon: Wrench },
    { key: 'nav.brands', href: '/brands', icon: Tag },
    { key: 'nav.models', href: '/models', icon: ListTree },
    { key: 'nav.locations', href: '/locations', icon: MapPin },
    { key: 'nav.reports', href: '/reports', icon: FileBarChart },
    { key: 'nav.settings', href: '/settings', icon: Settings },
  ]
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border",
        isMobile && collapsed ? "hidden" : "block",
        isMobile ? "w-screen border-none" : "",
      )}
      style={{ width: isMobile ? "100vw" : "var(--sidebar-width, 16rem)" }}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">{companyName || "AutoWash Pro"}</span>
            </div>
          )}
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-foreground hover:bg-white/90 border border-border"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? (lang === 'en' ? 'Expand sidebar' : 'Expandir sidebar') : (lang === 'en' ? 'Collapse sidebar' : 'Contraer sidebar')}
              suppressHydrationWarning
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {(user?.role === 'technician' ? items.filter((n) => ['/orders','/scanner'].includes(n.href)) : items).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-3 sm:py-2.5 text-base sm:text-sm font-medium transition-colors",
                  collapsed ? "justify-center" : "gap-4 sm:gap-3",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
                onClick={() => {
                  if (isMobile) setCollapsed(true)
                }}
              >
                <item.icon className="h-6 w-6 sm:h-5 sm:w-5" />
                {!collapsed && <span suppressHydrationWarning>{t(item.key)}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {!collapsed && user && (
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user.role === 'technician' ? t('role.technician') : user.role === 'admin' ? t('role.admin') : user.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
