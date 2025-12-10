"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scan, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from "@zxing/library"

export default function ScannerPage() {
  const { t } = useI18n()
  const [vinScan, setVinScan] = useState("")
  const [internalScan, setInternalScan] = useState("")
  
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<"vin" | "internal" | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [lastValue, setLastValue] = useState("")
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const [redirected, setRedirected] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)

  const continueToForm = useCallback((opts?: { vin?: string; internal?: string }) => {
    const vRaw = (opts?.vin ?? vinScan) || ""
    const cRaw = (opts?.internal ?? internalScan) || ""
    const vParam = vRaw.length === 17 ? encodeURIComponent(vRaw) : ""
    const cParam = cRaw.length > 0 ? encodeURIComponent(cRaw) : ""
    const query = `?v=${vParam}&c=${cParam}`
    setIsScanning(false)
    setRedirected(true)
    try {
      codeReaderRef.current?.reset()
    } catch {}
    try {
      const s: MediaStream | undefined = (videoRef.current as any)?.srcObject
      s?.getTracks?.().forEach((t) => t.stop())
    } catch {}
    router.push(`/create-order${query}`)
  }, [vinScan, internalScan, router])

  useEffect(() => {
    const start = async () => {
      try {
        const formats = [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.ITF,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417,
        ]
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints as any)
        codeReaderRef.current = reader
        const devices = await reader.listVideoInputDevices()
        setAvailableCameras(devices)
        let deviceId = selectedDeviceId
        if (!deviceId) {
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0]
          deviceId = backCam?.deviceId || null
          setSelectedDeviceId(deviceId)
        }
        const constraints: any = deviceId
          ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 16 / 9 } }
          : { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 16 / 9 } }
        await reader.decodeFromConstraints(constraints, videoRef.current!, async (result, err) => {
          if (result && result.getText()) {
            const value = result.getText().trim()
            if (!value || value === lastValue) return
            setLastValue(value)
            const val = value.toUpperCase()
            const sanitized = val.replace(/[^A-Z0-9]/g, "")
            if (scanMode === "vin") {
              const isVin = sanitized.length === 17
              if (isVin) {
                setVinScan(sanitized)
                if (!redirected) {
                  setRedirected(true)
                  continueToForm({ vin: sanitized, internal: "" })
                }
              } else {
                setInternalScan(sanitized)
                if (!redirected) {
                  setRedirected(true)
                  continueToForm({ vin: "", internal: sanitized })
                }
              }
            } else if (scanMode === "internal") {
              setInternalScan(sanitized)
              if (!redirected) {
                setRedirected(true)
                continueToForm({ vin: vinScan, internal: sanitized })
              }
            } else {
              const looksLikeVin = sanitized.length >= 17
              if (looksLikeVin) {
                setVinScan(sanitized)
                if (!redirected) {
                  setRedirected(true)
                  continueToForm({ vin: sanitized, internal: "" })
                }
              } else {
                setInternalScan(sanitized)
                if (!redirected) {
                  setRedirected(true)
                  continueToForm({ vin: vinScan, internal: sanitized })
                }
              }
            }
          } else if (err && !(err instanceof NotFoundException)) {
            
          }
        })
      } catch {}
    }
    if (isScanning) start()
    return () => {
      try {
        codeReaderRef.current?.reset()
        const s: MediaStream | undefined = (videoRef.current as any)?.srcObject
        s?.getTracks?.().forEach((t) => t.stop())
      } catch {}
    }
  }, [isScanning, lastValue, vinScan, internalScan, continueToForm, redirected, scanMode, selectedDeviceId])

  const startVinScan = () => {
    setRedirected(false)
    setVinScan("")
    setInternalScan("")
    setLastValue("")
    setScanMode("vin")
    setIsScanning(false)
  }
  const startInternalScan = () => {
    setRedirected(false)
    setVinScan("")
    setInternalScan("")
    setLastValue("")
    setScanMode("internal")
    setIsScanning(false)
  }
  const activateScanner = () => {
    setRedirected(false)
    setLastValue("")
    setIsScanning(true)
  }

  const switchCamera = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      const vids = list.filter((d) => d.kind === "videoinput")
      if (vids.length === 0) return
      setAvailableCameras(vids as any)
      if (!selectedDeviceId) {
        setSelectedDeviceId(vids[0]?.deviceId || null)
        return
      }
      const idx = vids.findIndex((v) => v.deviceId === selectedDeviceId)
      const next = vids[(idx + 1) % vids.length]
      setSelectedDeviceId(next?.deviceId || selectedDeviceId)
      setLastValue("")
    } catch {}
  }

  const tapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    try {
      const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const x = e.clientX - bounds.left
      const y = e.clientY - bounds.top
      setFocusPoint({ x, y })
      setTimeout(() => setFocusPoint(null), 800)

      const stream = (videoRef.current as any)?.srcObject as MediaStream | undefined
      const track = stream?.getVideoTracks?.()[0]
      const caps = track?.getCapabilities ? (track.getCapabilities() as any) : null
      if (!track || !caps) return
      const adv: any = {}
      if (caps.pointsOfInterest) {
        const nx = Math.min(Math.max(x / bounds.width, 0), 1)
        const ny = Math.min(Math.max(y / bounds.height, 0), 1)
        adv.pointsOfInterest = [{ x: nx, y: ny }]
      }
      if (Array.isArray(caps.focusMode)) {
        if (caps.focusMode.includes('single-shot')) adv.focusMode = 'single-shot'
        else if (caps.focusMode.includes('continuous')) adv.focusMode = 'continuous'
      }
      if (Object.keys(adv).length > 0) {
        await track.applyConstraints({ advanced: [adv] } as any)
      }
    } catch {}
  }


  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('scanner.title')} description={t('scanner.description')} />
        <div className="p-6">
          {!isScanning ? (
            <div className="flex flex-col items-center justify-center gap-6 py-24">
              <Scan className="h-48 w-48 text-primary" />
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  size="lg"
                  className={`${scanMode === "vin" ? "hover:bg-primary focus-visible:ring-0 transition-none" : "hover:bg-transparent hover:text-foreground focus-visible:ring-0 transition-none"} flex-1 h-12`}
                  variant={scanMode === "vin" ? "default" : "outline"}
                  onClick={startVinScan}
                >
                  {t('scanner.selectVin')}
                </Button>
                <Button
                  size="lg"
                  className={`${scanMode === "internal" ? "hover:bg-primary focus-visible:ring-0 transition-none" : "hover:bg-transparent hover:text-foreground focus-visible:ring-0 transition-none"} flex-1 h-12`}
                  variant={scanMode === "internal" ? "default" : "outline"}
                  onClick={startInternalScan}
                >
                  {t('scanner.selectCode')}
                </Button>
              </div>
              <div className="w-full">
                <Button size="lg" className="w-full h-12 hover:bg-primary focus-visible:ring-0 transition-none" onClick={activateScanner} disabled={!scanMode}>{t('scanner.activate')}</Button>
              </div>
              <div className="w-full mt-8 grid gap-4">
                <div>
                  <Label htmlFor="vinManual">VIN</Label>
                  <Input
                    id="vinManual"
                    value={vinScan}
                    onChange={(e) => setVinScan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder={t('scanner.vinPlaceholder')}
                    className="bg-muted font-mono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="codeManual">{t('scanner.codeLabel')}</Label>
                  <Input
                    id="codeManual"
                    value={internalScan}
                    onChange={(e) => setInternalScan(e.target.value.toUpperCase())}
                    placeholder={t('scanner.codePlaceholder')}
                  />
                </div>
                <div className="w-full">
                  <Button size="lg" className="w-full h-12 hover:bg-primary focus-visible:ring-0 transition-none" onClick={() => continueToForm()}>{t('scanner.continue')}</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl border border-border overflow-hidden h-[80vh] sm:h-[60vh]" onClick={tapToFocus}>
              <video ref={videoRef} className="w-full h-full object-cover bg-black" muted playsInline />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 border-2 border-white/30 rounded" />
              </div>
              {focusPoint && (
                <div
                  className="absolute rounded-full border-2 border-white/80"
                  style={{ left: focusPoint.x - 24, top: focusPoint.y - 24, width: 48, height: 48 }}
                />
              )}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Button size="icon" variant="secondary" className="hover:bg-secondary focus-visible:ring-0 transition-none" onClick={switchCamera} aria-label={t('scanner.switchCamera')}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button size="lg" variant="secondary" className="hover:bg-secondary focus-visible:ring-0 transition-none" onClick={() => { setIsScanning(false) }}>{t('scanner.stop')}</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
