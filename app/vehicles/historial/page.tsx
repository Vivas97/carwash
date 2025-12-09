"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { store } from "@/lib/store"
import { useEffect, useState } from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
 
import { cn, formatDateTime, formatCurrency } from "@/lib/utils"
import { Receipt, Tag, Barcode } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function VehicleHistoryPage() {
  const { t, lang } = useI18n()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [vehicle, setVehicle] = useState<any | undefined>(undefined)
  const [entries, setEntries] = useState<any[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewList, setPreviewList] = useState<string[]>([])
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)
  useEffect(() => {
    if (previewOpen && carouselApi) {
      try { carouselApi.scrollTo(previewIndex) } catch {}
    }
  }, [previewOpen, carouselApi, previewIndex])

  useEffect(() => {
    ;(async () => {
      if (!id) return
      try {
        const vRes = await fetch(`/api/vehicles/${id}`)
        if (vRes.ok) setVehicle(await vRes.json())
      } catch {}
      try {
        const eRes = await fetch(`/api/entries/by-vehicle?id=${id}`)
        if (eRes.ok) setEntries(await eRes.json())
      } catch {}
    })()
  }, [id])

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

  const totalPrice = entries.reduce((sum, e) => sum + (e?.service?.price || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header
          title={(vehicle ?? entries[0]?.vehicle)
            ? (lang === 'en'
                ? `Vehicle History: ${(vehicle ?? entries[0]?.vehicle)?.brand} ${(vehicle ?? entries[0]?.vehicle)?.model}`
                : `Historial de ${(vehicle ?? entries[0]?.vehicle)?.brand} ${(vehicle ?? entries[0]?.vehicle)?.model}`)
            : t('createOrder.historyTab')}
          description={lang === 'en' ? 'Vehicle details and entries' : 'Detalles y entradas del vehículo'}
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('createOrder.internalCode')}</span>
              </div>
              <p className="font-medium">{(vehicle ?? entries[0]?.vehicle)?.internalCode || "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('createOrder.vin')}</span>
              </div>
              <p className="font-mono text-sm">{(vehicle ?? entries[0]?.vehicle)?.vin || "—"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">{t('vehicleHistory.entries')} ({entries.length})</h4>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('vehicleHistory.entriesEmpty')}</p>
            ) : (
              <>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {entry.service?.name}
                          <span className="ml-2 text-sm text-muted-foreground">
                            {formatCurrency(entry.service?.price || 0, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </p>
                        
                      </div>
                      <Badge variant="outline" className={cn("border", statusColors[entry.status as keyof typeof statusColors])}>
{statusLabels[entry.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>

                    {entry.updates && entry.updates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('vehicleHistory.updates')} ({entry.updates.length})</p>
                        <div className="space-y-2">
                          {entry.updates.map((u: any) => (
                            <div key={u.id} className="rounded-md border border-border p-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm">{u.text}</p>
                                  <p className="text-xs text-muted-foreground">{formatDateTime(new Date(u.createdAt))}</p>
                                </div>
                                {u.photos && u.photos.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    {u.photos.map((p: any, i: number) => {
                                      const urls = u.photos.map((x: any) => x.url ?? x)
                                      const src = urls[i]
                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => {
                                            setPreviewList(urls)
                                            setPreviewIndex(i)
                                            setPreviewSrc(null)
                                            setPreviewOpen(true)
                                          }}
                                          className="block"
                                        >
                                          <img src={src} alt={`${t('vehicleHistory.image')} ${i + 1}`} className="h-12 w-12 object-cover rounded border" loading="lazy" />
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Array.isArray(entry.photos) && entry.photos.filter((p: any) => p.type === 'initial').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('vehicleHistory.arrivalPhotos')}</p>
                        <p className="text-xs text-muted-foreground">{t('createOrder.entry')}: {formatDateTime(new Date(entry.arrivalDate))} · {entry.employee?.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.photos.filter((p: any) => p.type === 'initial').map((p: any, i: number) => (
                            <button
                              key={`init-${p.id ?? i}`}
                              type="button"
                              onClick={() => {
                                const urls = entry.photos.filter((x: any) => x.type === 'initial').map((x: any) => x.url)
                                setPreviewList(urls)
                                setPreviewIndex(i)
                                setPreviewSrc(null)
                                setPreviewOpen(true)
                                try { carouselApi?.scrollTo(i) } catch {}
                              }}
                              className="block"
                            >
                              <img src={p.url} alt={`${t('vehicleHistory.image')} ${i + 1}`} className="h-16 w-16 object-cover rounded border" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {Array.isArray(entry.photos) && entry.photos.filter((p: any) => p.type === 'final').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('vehicleHistory.departurePhotos')}</p>
                        <p className="text-xs text-muted-foreground">{t('createOrder.exit')}: {entry.completionDate ? formatDateTime(new Date(entry.completionDate)) : "—"}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.photos.filter((p: any) => p.type === 'final').map((p: any, i: number) => (
                            <button
                              key={`final-${p.id ?? i}`}
                              type="button"
                              onClick={() => {
                                const urls = entry.photos.filter((x: any) => x.type === 'final').map((x: any) => x.url)
                                setPreviewList(urls)
                                setPreviewIndex(i)
                                setPreviewSrc(null)
                                setPreviewOpen(true)
                                try { carouselApi?.scrollTo(i) } catch {}
                              }}
                              className="block"
                            >
                              <img src={p.url} alt={`${t('vehicleHistory.image')} ${i + 1}`} className="h-16 w-16 object-cover rounded border" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {entries.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 ring-1 ring-primary/10 px-5 py-4 shadow-sm w-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                      <Receipt className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vehicleHistory.total')}</p>
                      <p className="text-2xl font-semibold tracking-tight">
                        {formatCurrency(totalPrice, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </main>
      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open)
        if (!open) {
          setPreviewList([])
          setPreviewSrc(null)
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('vehicleHistory.photosTitle')}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {previewList.length > 0 ? (
              <Carousel opts={{ loop: true }} setApi={setCarouselApi} className="w-full">
                <CarouselContent>
                  {previewList.map((src, idx) => (
                    <CarouselItem key={idx}>
                      <img src={src} alt={`${t('vehicleHistory.image')} ${idx + 1}`} className="w-full h-auto max-h-[80vh] object-contain rounded" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-6" />
                <CarouselNext className="-right-6" />
              </Carousel>
            ) : previewSrc ? (
              <img src={previewSrc} alt={t('vehicleHistory.image')} className="w-full h-auto max-h-[80vh] object-contain rounded" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
