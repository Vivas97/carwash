"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { VehicleForm } from "@/components/vehicle-form"
// import { store } from "@/lib/store"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"

function CreateOrderContent() {
  const { t } = useI18n()
  const params = useSearchParams()
  const router = useRouter()
  const vinParam = params.get("v") || undefined
  const internalParam = params.get("c") || undefined

  const [existingVehicleId, setExistingVehicleId] = useState<string | null>(null)
  const [existingVehicleObj, setExistingVehicleObj] = useState<any | null>(null)
  const [initialPhotos, setInitialPhotos] = useState<string[]>([])
  const [isCamOpen, setIsCamOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileCamRef = useRef<HTMLInputElement | null>(null)
  const fileGalleryRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"register" | "history">("register")

  useEffect(() => {
    const load = async () => {
      const v = vinParam
      const c = internalParam
      try {
        const params = new URLSearchParams()
        if (v) params.set("vin", v)
        if (c) params.set("code", c)
        if (v || c) {
          const res = await fetch(`/api/vehicles/by-code?${params.toString()}`)
          if (res.ok) {
            const data = await res.json()
            if (data?.vehicle) {
              setExistingVehicleObj(data.vehicle)
              setExistingVehicleId(data.vehicle.id)
            } else {
              setExistingVehicleObj(null)
              setExistingVehicleId(null)
            }
          } else {
            setExistingVehicleObj(null)
            setExistingVehicleId(null)
          }
        } else {
          setExistingVehicleObj(null)
          setExistingVehicleId(null)
        }
      } catch {
        setExistingVehicleObj(null)
      }
      try {
        const raw = localStorage.getItem("scanner:initialPhotos")
        if (raw) setInitialPhotos(JSON.parse(raw))
      } catch {}
    }
    load()
  }, [vinParam, internalParam])

  useEffect(() => {
    const loadHistory = async () => {
      if (!existingVehicleId) { setHistoryEntries([]); return }
      try {
        const res = await fetch(`/api/entries/by-vehicle?id=${encodeURIComponent(existingVehicleId)}`)
        if (!res.ok) { setHistoryEntries([]); return }
        const data = await res.json()
        setHistoryEntries(Array.isArray(data) ? data : [])
      } catch { setHistoryEntries([]) }
    }
    loadHistory()
  }, [existingVehicleId])

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const toRead = Array.from(files).slice(0, 4 - initialPhotos.length)
    const readPromises = toRead.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        }),
    )
    const results = await Promise.all(readPromises)
    setInitialPhotos((prev) => [...prev, ...results].slice(0, 4))
  }

  const removePhoto = (index: number) => {
    setInitialPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      if (videoRef.current) {
        ;(videoRef.current as any).srcObject = stream
        await videoRef.current.play()
      }
    } catch {}
  }

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    } catch {}
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setInitialPhotos((prev) => [...prev, dataUrl].slice(0, 4))
    setIsCamOpen(false)
  }

  useEffect(() => {
    if (isCamOpen) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isCamOpen])

  const onSubmit = async (data: { vehicle: any; employeeId: string; serviceId: string; notes: string }) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: data.vehicle.id,
          vehicle: {
            id: data.vehicle.id,
            vin: data.vehicle.vin,
            internalCode: data.vehicle.internalCode,
            brand: data.vehicle.brand,
            model: data.vehicle.model,
            color: data.vehicle.color,
            year: data.vehicle.year,
          },
          employeeId: data.employeeId,
          serviceId: data.serviceId,
          status: 'pending',
          arrivalDate: new Date().toISOString(),
          notes: data.notes,
          initialPhotos,
        }),
      })
      if (!res.ok) throw new Error('Error al registrar entrada')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    try {
      localStorage.removeItem('scanner:initialPhotos')
    } catch {}
    try {
      const detail = {
        type: 'new-order',
        message: `Nueva orden: ${data.vehicle.brand} ${data.vehicle.model} (${data.vehicle.internalCode})`,
        date: new Date().toISOString(),
      }
      window.dispatchEvent(new CustomEvent('app:notify', { detail }))
    } catch {}
    router.push('/orders')
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Sidebar /><main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}><Header title={t('createOrder.title')} description={t('createOrder.loading')} /><div className="p-6">{t('createOrder.loading')}</div></main></div>}>
      <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('createOrder.title')} description={t('createOrder.description')} />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-2 sm:items-center">
            <Button
              variant="default"
              className="w-full sm:w-auto justify-center bg-primary text-white hover:bg-primary"
              onClick={() => setActiveTab("register")}
            >
              {t('createOrder.registerTab')}
            </Button>
            <Button
              variant="default"
              className="w-full sm:w-auto justify-center bg-primary text-white hover:bg-primary"
              onClick={() => setActiveTab("history")}
            >
              {t('createOrder.historyTab')}
            </Button>
          </div>

          {activeTab === "register" && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2">
              <h3 className="font-medium">{t('createOrder.arrivalPhotos')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileGalleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              <input ref={fileCamRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              <Button variant="outline" className="hover:bg-muted" onClick={() => fileGalleryRef.current?.click()}>{t('createOrder.select')}</Button>
              <Button variant="outline" className="hover:bg-muted" onClick={() => fileCamRef.current?.click()}>{t('createOrder.takePhoto')}</Button>
              <Button variant="secondary" onClick={() => setInitialPhotos([])}>{t('createOrder.clear')}</Button>
            </div>
            <Dialog open={isCamOpen} onOpenChange={setIsCamOpen}>
              <DialogContent className="p-4">
                <DialogHeader>
                  <DialogTitle>{t('createOrder.captureTitle')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg overflow-hidden border">
                    <video ref={videoRef} className="w-full aspect-video object-cover bg-black" muted playsInline />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={captureFromCamera}>{t('createOrder.capture')}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {initialPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {initialPhotos.map((src, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border">
                    <Image src={src} alt={`${t('vehicleHistory.image')} ${i + 1}`} width={320} height={128} className="w-full h-32 object-cover" />
                    <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removePhoto(i)}>{t('createOrder.remove')}</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {activeTab === "register" && (
            <VehicleForm
              vin={vinParam}
              initialInternalCode={internalParam}
              existingVehicle={existingVehicleObj || undefined}
              onSubmit={onSubmit}
              onCancel={() => router.push("/scanner")}
            />
          )}

          {activeTab === "history" && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-medium mb-4">{t('createOrder.historyTab')}</h3>
              {!existingVehicleId && (
                <p className="text-sm text-muted-foreground">{t('createOrder.historyHint')}</p>
              )}
              {existingVehicleId && (
              <>
              {/* Datos del vehículo resumidos */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">{t('createOrder.vehicle')}</p>
                  <p className="font-medium">{(existingVehicleObj ?? historyEntries[0]?.vehicle)?.brand} {(existingVehicleObj ?? historyEntries[0]?.vehicle)?.model} {(existingVehicleObj ?? historyEntries[0]?.vehicle)?.year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('createOrder.color')}</p>
                  <p className="font-medium">{(existingVehicleObj ?? historyEntries[0]?.vehicle)?.color}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('createOrder.internalCode')}</p>
                  <p className="font-medium">{(existingVehicleObj ?? historyEntries[0]?.vehicle)?.internalCode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('createOrder.vin')}</p>
                  <p className="font-mono">{(existingVehicleObj ?? historyEntries[0]?.vehicle)?.vin}</p>
                </div>
              </div>

              {historyEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('createOrder.historyEmpty')}</p>
              ) : (
                <div className="space-y-4">
                  {historyEntries.map((e) => {
                    const statusClasses = {
                      pending: "bg-warning/20 text-warning border-warning/30",
                      "in-progress": "bg-primary/20 text-primary border-primary/30",
                      completed: "bg-success/20 text-success border-success/30",
                    } as const
                    const updates = (e.updates || [])
                    return (
                      <div key={e.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{e.service?.name}</p>
                          <Badge variant="outline" className={`border ${statusClasses[e.status as keyof typeof statusClasses]}`}>{e.status === 'pending' ? t('status.pending') : e.status === 'in-progress' ? t('status.inProgress') : t('status.completed')}</Badge>
                        </div>
                        <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('createOrder.entry')}</p>
                            <p className="font-medium">{formatDateTime(new Date(e.arrivalDate))}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('createOrder.exit')}</p>
                            <p className="font-medium">{e.completionDate ? formatDateTime(new Date(e.completionDate)) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('createOrder.technician')}</p>
                            <p className="font-medium">{e.employee?.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('createOrder.price')}</p>
                            <p className="font-medium">{formatCurrency(e.service?.price || 0, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                        {updates.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">{t('createOrder.updates')}</p>
                            <div className="space-y-3">
                              {updates.map((u: any) => (
                                <div key={u.id} className="rounded border p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">{u.text}</p>
                                    <p className="text-xs text-muted-foreground">{formatDateTime(new Date(u.createdAt))}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              </>
              )}
            </div>
          )}
        </div>
      </main>
      </div>
    </Suspense>
  )
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Sidebar /><main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}><Header title="Crear Orden" description="Cargando..." /><div className="p-6">Cargando...</div></main></div>}>
      <CreateOrderContent />
    </Suspense>
  )
}
