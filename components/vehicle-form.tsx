"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/components/i18n-provider"
// import { store } from "@/lib/store"
import type { Vehicle } from "@/lib/types"

interface VehicleFormProps {
  vin?: string
  initialInternalCode?: string
  existingVehicle?: Vehicle
  onSubmit: (data: {
    vehicle: Vehicle
    employeeId: string
    serviceId: string
    notes: string
  }) => void
  onCancel: () => void
}

export function VehicleForm({ vin, initialInternalCode, existingVehicle, onSubmit, onCancel }: VehicleFormProps) {
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    vin: existingVehicle?.vin || vin || "",
    internalCode: existingVehicle?.internalCode || initialInternalCode || "",
    brandId: "",
    modelId: "",
    brandText: existingVehicle?.brand || "",
    modelText: existingVehicle?.model || "",
    color: existingVehicle?.color || "",
    year: existingVehicle?.year?.toString() || new Date().getFullYear().toString(),
    employeeId: "",
    serviceId: "",
    notes: "",
  })
  const [isDecoding, setIsDecoding] = useState(false)
  const [vinDetails, setVinDetails] = useState<{
    manufacturer?: string
    vehicleType?: string
    bodyClass?: string
    make?: string
    model?: string
    modelYear?: string
  }>({})

  const [employees, setEmployees] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        const [eRes, sRes, bRes, mRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/services'),
          fetch('/api/brands'),
          fetch('/api/models'),
        ])
        const [eData, sData, bData, mData] = await Promise.all([
          eRes.json(),
          sRes.json(),
          bRes.json(),
          mRes.json(),
        ])
        setEmployees(Array.isArray(eData) ? eData.filter((e: any) => e.isActive && e.role === 'technician') : [])
        setServices(Array.isArray(sData) ? sData.filter((s: any) => s.isActive) : [])
        setBrands(Array.isArray(bData) ? bData.filter((b: any) => b.isActive) : [])
        setModels(Array.isArray(mData) ? mData.filter((m: any) => m.isActive) : [])
      } catch {
        setEmployees([])
        setServices([])
        setBrands([])
        setModels([])
      }
    })()
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data?.id) {
            setMe(data)
            setFormData((prev) => ({ ...prev, employeeId: String(data.id) }))
          }
        }
      } catch {}
    })()
  }, [])
  useEffect(() => {
    if (existingVehicle) {
      setFormData((prev) => ({
        ...prev,
        vin: existingVehicle.vin || prev.vin,
        internalCode: existingVehicle.internalCode || prev.internalCode,
        brandText: existingVehicle.brand || prev.brandText,
        modelText: existingVehicle.model || prev.modelText,
        color: existingVehicle.color || prev.color,
        year: (existingVehicle.year ?? Number(prev.year)).toString(),
      }))
    }
  }, [existingVehicle])

  const modelsByBrand = useMemo(() => models.filter((m) => m.brandId === formData.brandId), [models, formData.brandId])
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const list: number[] = []
    for (let y = currentYear; y >= 1980; y--) list.push(y)
    return list
  }, [currentYear])

  useEffect(() => {
    const run = async () => {
      if (existingVehicle) return
      const v = formData.vin.trim().toUpperCase()
      if (v.length !== 17) return
      if (isDecoding) return
      setIsDecoding(true)
      try {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(v)}?format=json`)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          const r = data?.Results?.[0] || null
          const makeName = String(r?.Make || "").trim()
          const modelName = String(r?.Model || "").trim()
          const yearVal = String(r?.ModelYear || "").trim()
          setVinDetails({
            manufacturer: String(r?.Manufacturer || "").trim(),
            vehicleType: String(r?.VehicleType || "").trim(),
            bodyClass: String(r?.BodyClass || "").trim(),
            make: makeName,
            model: modelName,
            modelYear: yearVal,
          })
          if (makeName) setFormData((prev) => ({ ...prev, brandText: makeName }))
          if (modelName) setFormData((prev) => ({ ...prev, modelText: modelName }))
          if (yearVal && /^\d{4}$/.test(yearVal)) {
            setFormData((prev) => ({ ...prev, year: yearVal }))
          }
        }
      } catch {}
      setIsDecoding(false)
    }
    run()
  }, [formData.vin, brands, models, existingVehicle, isDecoding])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let vehicle = existingVehicle as any

    if (!vehicle) {
      const vinValue = formData.vin.trim()
      const codeValue = formData.internalCode.trim()
      const brandName = brands.find((b) => b.id === formData.brandId)?.name || formData.brandText || ""
      const modelName = models.find((m) => m.id === formData.modelId)?.name || formData.modelText || ""
      try {
        // Verificar nuevamente en BD para evitar duplicados
        const qs = new URLSearchParams()
        if (vinValue) qs.set('vin', vinValue)
        if (codeValue) qs.set('code', codeValue)
        const check = await fetch(`/api/vehicles/by-code?${qs.toString()}`)
        if (check.ok) {
          const chk = await check.json()
          if (chk?.vehicle) {
            vehicle = chk.vehicle
          }
        }
        if (!vehicle) {
          const res = await fetch('/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vin: vinValue,
              internalCode: formData.internalCode,
              brand: brandName,
              model: modelName,
              color: formData.color,
              year: Number.parseInt(formData.year),
            }),
          })
          if (!res.ok) {
            const text = await res.json().catch(() => ({ error: 'Error' }))
            throw new Error(text?.error || 'Error al crear vehículo')
          }
          const created = await res.json()
          vehicle = created
        }
      } catch (err) {
        alert((err as Error).message)
        return
      }
    }

    onSubmit({
      vehicle,
      employeeId: formData.employeeId,
      serviceId: formData.serviceId,
      notes: formData.notes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-medium text-card-foreground mb-4">
          {existingVehicle ? t('vehicleForm.foundTitle') : t('vehicleForm.newTitle')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="vin">{t('vehicleForm.vinLabel')}</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              placeholder={t('vehicleForm.vinPlaceholder')}
              required
              disabled={!!existingVehicle}
              className="bg-muted font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="internalCode">{t('vehicleForm.internalCodeLabel')}</Label>
            <Input
              id="internalCode"
              value={formData.internalCode}
              onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
              placeholder={t('vehicleForm.internalCodePlaceholder')}
              required
              disabled={!!existingVehicle}
            />
          </div>

          {formData.vin.trim().length === 17 && (
            <div className="sm:col-span-2 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('vehicleForm.manufacturer')}</Label>
                  <Input value={vinDetails.manufacturer || ""} disabled />
                </div>
                <div>
                  <Label>{t('vehicleForm.vehicleType')}</Label>
                  <Input value={vinDetails.vehicleType || ""} disabled />
                </div>
                <div>
                  <Label>{t('vehicleForm.bodyClass')}</Label>
                  <Input value={vinDetails.bodyClass || ""} disabled />
                </div>
                <div>
                  <Label>{t('vehicleForm.make')}</Label>
                  <Input value={vinDetails.make || ""} disabled />
                </div>
                <div>
                  <Label>{t('vehicleForm.model')}</Label>
                  <Input value={vinDetails.model || ""} disabled />
                </div>
                <div>
                  <Label>{t('vehicleForm.year')}</Label>
                  <Input value={vinDetails.modelYear || formData.year} disabled />
                </div>
              </div>
            </div>
          )}


          {existingVehicle ? (
            <div>
              <Label>{t('vehicleForm.make')}</Label>
              <Input value={existingVehicle.brand} disabled />
            </div>
          ) : !vinDetails.make ? (
            <div>
              <Label htmlFor="brandText">{t('vehicleForm.brandLabel')}</Label>
              <Input
                id="brandText"
                value={formData.brandText}
                onChange={(e) => setFormData({ ...formData, brandText: e.target.value, brandId: "" })}
                placeholder={t('vehicleForm.brandPlaceholder')}
                required
              />
            </div>
          ) : null}

          {existingVehicle ? (
            <div>
              <Label>{t('vehicleForm.model')}</Label>
              <Input value={existingVehicle.model} disabled />
            </div>
          ) : !vinDetails.model ? (
            <div>
              <Label htmlFor="modelText">{t('vehicleForm.modelLabel')}</Label>
              <Input
                id="modelText"
                value={formData.modelText}
                onChange={(e) => setFormData({ ...formData, modelText: e.target.value, modelId: "" })}
                placeholder={t('vehicleForm.modelPlaceholder')}
                required
              />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Label htmlFor="color">{t('vehicleForm.colorLabel')}</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder={t('vehicleForm.colorPlaceholder')}
              required
              disabled={!!existingVehicle}
            />
          </div>

          {!vinDetails.modelYear && (
            <div className="sm:col-span-2">
              <Label htmlFor="year">Año *</Label>
              {existingVehicle ? (
                <Input id="year" value={formData.year} disabled />
              ) : (
                <Select
                  value={formData.year}
                  onValueChange={(value) => setFormData({ ...formData, year: value })}
                  required
                >
                  <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                    <SelectValue placeholder={t('vehicleForm.selectYear')} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-medium text-card-foreground mb-4">{t('vehicleForm.assignmentTitle')}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {!formData.employeeId ? (
            <div>
              <Label htmlFor="employee">{t('vehicleForm.assignedTechnicianLabel')}</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                required
              >
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue placeholder={t('vehicleForm.selectTechnician')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>{t('vehicleForm.assignedTechnician')}</Label>
              <Input value={me?.name || t('vehicleForm.currentUser')} disabled />
            </div>
          )}

          <div>
            <Label htmlFor="service">{t('vehicleForm.serviceLabel')}</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              required
            >
              <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                <SelectValue placeholder={t('vehicleForm.selectService')} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - ${service.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes">{t('vehicleForm.notesLabel')}</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('vehicleForm.notesPlaceholder')}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('vehicleForm.cancel')}
        </Button>
        <Button type="submit">{t('vehicleForm.submit')}</Button>
      </div>
    </form>
  )
}
