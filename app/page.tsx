"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { StatsCard } from "@/components/stats-card"
import { RecentEntries } from "@/components/recent-entries"
import { Car, Users, Wrench, DollarSign, Clock, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function DashboardPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalEmployees: 0,
    totalServices: 0,
    todayEntries: 0,
    completedToday: 0,
    inProgressToday: 0,
    pendingToday: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/stats')
        const data = await res.json()
        setStats(data)
      } catch {}
    })()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('dashboard.title')} description={t('dashboard.description')} />
        <div className="p-6">
          {/* Cards principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title={t('dashboard.pending')} value={stats.pendingToday} icon={Clock} />
            <StatsCard title={t('dashboard.inProgress')} value={stats.inProgressToday} icon={Wrench} />
            <StatsCard title={t('dashboard.completed')} value={stats.completedToday} icon={CheckCircle} />
            <StatsCard title={t('dashboard.totalRevenue')} value={formatCurrency(stats.totalRevenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={DollarSign} />
          </div>

          {/* Recent Entries */}
          <div className="mt-6">
            <RecentEntries />
          </div>
        </div>
      </main>
    </div>
  )
}
