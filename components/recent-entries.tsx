"use client"

import { useEffect, useState } from "react"
// import { store } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { cn, formatTime } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
import { Clock, Car, ScanLine } from "lucide-react"

export function RecentEntries() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<any[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/entries/recent')
        const data = await res.json()
        setEntries(data)
      } catch {
        setEntries([])
      }
    })()
  }, [])

  const statusColors = {
    pending: "bg-warning/20 text-warning border-warning/30",
    "in-progress": "bg-primary/20 text-primary border-primary/30",
    completed: "bg-success/20 text-success border-success/30",
  }

  const statusLabels = {
    pending: t('status.pending'),
    "in-progress": t('status.inProgress'),
    completed: t('status.completed'),
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="font-semibold text-card-foreground">{t('dashboard.recentEntries')}</h3>
      </div>
      <div className="divide-y divide-border">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">{t('dashboard.recentEmpty')}</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                <Car className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground truncate">
                  {entry.vehicle?.brand} {entry.vehicle?.model}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 break-all">
                    <ScanLine className="h-3 w-3" />
                    {entry.vehicle?.vin}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {t('dashboard.arrival')}: {formatTime(new Date(entry.arrivalDate))}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {t('dashboard.exit')}: {entry.completionDate ? formatTime(new Date(entry.completionDate)) : "—"}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={cn("border sm:ml-auto", statusColors[entry.status as keyof typeof statusColors])}>
{statusLabels[entry.status as keyof typeof statusLabels]}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
