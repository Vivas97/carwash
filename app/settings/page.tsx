"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
// import { store } from "@/lib/store"
import { useEffect } from "react"
import { useI18n } from "@/components/i18n-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [ein, setEin] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [logo, setLogo] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP')
  const { t } = useI18n()
  
  

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, ein, address, phone, logo, currency }),
      })
      if (!res.ok) throw new Error('Error al guardar configuración')
      try { localStorage.setItem('settings:currency', currency) } catch {}
      try { window.dispatchEvent(new Event('settings:updated')) } catch {}
    } catch (err) {
      alert((err as Error).message)
    }
  }

  useEffect(() => {
    ;(async () => {
      const [sRes, meRes] = await Promise.all([fetch('/api/settings'), fetch('/api/auth/me')])
      if (sRes.ok) {
        const data = await sRes.json()
        setCompanyName(data.companyName || '')
        setEin(data.ein || '')
        setAddress(data.address || '')
        setPhone(data.phone || '')
        setLogo(data.logo || null)
        setCurrency((data.currency === 'USD' ? 'USD' : 'COP'))
        try { localStorage.setItem('settings:currency', (data.currency === 'USD' ? 'USD' : 'COP')) } catch {}
      }
      if (meRes.ok) {
        const me = await meRes.json()
        setUserId(me?.id || null)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('settings.title')} description={t('settings.description')} />
        <div className="p-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('settings.companyName')}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej. Mi Carwash S.A. de C.V."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ein">{t('settings.ein')}</Label>
                <Input
                  id="ein"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  placeholder="Ej. RFC/EIN de la empresa"
                />
              </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="currency">{t('settings.currency')}</Label>
              <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">{t('settings.currency.cop')}</SelectItem>
                  <SelectItem value="USD">{t('settings.currency.usd')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t('settings.address')}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Calle 123, Colonia, Ciudad, País"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">{t('settings.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +52 555 123 4567"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logo">{t('settings.logo')}</Label>
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded border bg-muted overflow-hidden">
                    {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : null}
                  </div>
                  <Input id="logo" type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setLogo(String(reader.result))
                    reader.readAsDataURL(file)
                  }} />
                  <Button type="button" variant="secondary" onClick={() => setLogo(null)}>{t('settings.removeLogo')}</Button>
                </div>
              </div>
              
              
            </div>

            

            <div className="flex">
              <Button className="w-full" onClick={handleSave}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
