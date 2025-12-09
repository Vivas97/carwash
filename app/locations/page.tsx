"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { store } from "@/lib/store"
import type { Location } from "@/lib/types"
import { Plus, Edit, Trash2, Power, Search } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function LocationsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    isActive: true,
  })

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase()
    return (
      l.name.toLowerCase().includes(q) ||
      (l.address || "").toLowerCase().includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.country || "").toLowerCase().includes(q)
    )
  })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name: formData.name,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      isActive: formData.isActive,
    }

    try {
      if (editingLocation) {
        const res = await fetch(`/api/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Error al actualizar ubicación')
      } else {
        const res = await fetch(`/api/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Error al crear ubicación')
      }
    } catch (err) {
      alert((err as Error).message)
      return
    }

    await loadLocations()
    setIsDialogOpen(false)
    setEditingLocation(null)
    setFormData({ name: "", address: "", city: "", country: "", isActive: true })
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || "",
      city: location.city || "",
      country: location.country || "",
      isActive: location.isActive,
    })
    setIsDialogOpen(true)
  }

  const requestDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/locations/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar ubicación')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadLocations()
    const newTotal = Math.max(1, Math.ceil(locations.length / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  const handleToggleActive = async (id: string) => {
    const current = locations.find((l) => l.id === id)
    if (!current) return
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current.isActive }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadLocations()
  }

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/locations')
      if (!res.ok) {
        setLocations([])
        return
      }
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await res.json()
        setLocations(Array.isArray(data) ? data : [])
      } else {
        setLocations([])
      }
    } catch {
      setLocations([])
    }
  }

  useEffect(() => {
    loadLocations()
    setPage(1)
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('locations.title')} description={t('locations.description')} />
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative flex-[2] w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('locations.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditingLocation(null)
                  setFormData({ name: "", address: "", city: "", country: "", isActive: true })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('locations.new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-6">
                <DialogHeader>
                  <DialogTitle>{editingLocation ? t('locations.edit') : t('locations.new')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="mb-2">{t('locations.name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="mb-2">{t('locations.address')}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="mb-2">{t('locations.city')}</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="mb-2">{t('locations.country')}</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                  {editingLocation && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive">{t('locations.active')}</Label>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t('locations.cancel')}
                    </Button>
                    <Button type="submit">{editingLocation ? t('locations.save') : t('locations.create')}</Button>
                </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('locations.table.name')}</TableHead>
                  <TableHead>{t('locations.table.address')}</TableHead>
                  <TableHead>{t('locations.table.city')}</TableHead>
                  <TableHead>{t('locations.table.country')}</TableHead>
                  <TableHead>{t('locations.table.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('locations.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{location.address || ""}</TableCell>
                      <TableCell>{location.city || ""}</TableCell>
                      <TableCell>{location.country || ""}</TableCell>
                      <TableCell>
                        <Badge variant={location.isActive ? "default" : "secondary"}>
                          {location.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button
                            size="icon-sm"
                            className={`${location.isActive ? "bg-success text-white hover:bg-success/90" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`}
                            onClick={() => handleToggleActive(location.id)}
                            aria-label={location.isActive ? t('common.deactivate') : t('common.activate')}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="icon-sm"
                            className="bg-warning text-white hover:bg-warning/90"
                            onClick={() => handleEdit(location)}
                            aria-label={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => requestDelete(location.id)}
                            aria-label={t('common.remove')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {"<"}
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1
                return (
                  <Button
                    key={n}
                    variant={page === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {">"}
              </Button>
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('locations.deleteTitle')}
          description={t('locations.deleteDesc')}
          confirmText={t('common.remove')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  )
}
