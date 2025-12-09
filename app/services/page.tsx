"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { store } from "@/lib/store"
import type { Service } from "@/lib/types"
import { Plus, Edit, Trash2, Power, Search } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatCurrency } from "@/lib/utils"

export default function ServicesPage() {
  const { t } = useI18n()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    isActive: true,
  })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const serviceData = {
      name: formData.name,
      description: formData.description,
      price: Number.parseFloat(formData.price),
      duration: Number.parseInt(formData.duration),
      isActive: formData.isActive,
    }

    try {
      if (editingService) {
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        })
        if (!res.ok) throw new Error('Error al actualizar servicio')
      } else {
        const res = await fetch(`/api/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        })
        if (!res.ok) throw new Error('Error al crear servicio')
      }
    } catch (err) {
      alert((err as Error).message)
      return
    }

    await loadServices()
    setIsDialogOpen(false)
    setEditingService(null)
    setFormData({ name: "", description: "", price: "", duration: "", isActive: true })
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      isActive: service.isActive,
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
      const res = await fetch(`/api/services/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar servicio')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadServices()
    const newTotal = Math.max(1, Math.ceil(services.length / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  const handleToggleActive = async (id: string) => {
    const current = services.find((s) => s.id === id)
    if (!current) return
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current.isActive }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadServices()
  }

  const loadServices = async () => {
    const res = await fetch('/api/services')
    const data = await res.json()
    setServices(data)
  }

  useEffect(() => {
    loadServices()
    setPage(1)
  }, [])

  const filteredServices = services.filter((s) => {
    const q = search.trim().toLowerCase()
    if (q === "") return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q)
    )
  })
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize))
  const paginatedServices = filteredServices.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('services.title')} description={t('services.description')} />
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('services.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditingService(null)
                  setFormData({ name: "", description: "", price: "", duration: "", isActive: true })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('services.new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-6">
                <DialogHeader>
                  <DialogTitle>{editingService ? t('services.edit') : t('services.new')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="mb-2">{t('services.name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="mb-2">{t('services.descriptionLabel')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="mb-2">{t('services.price')}</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="mb-2">{t('services.duration')}</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingService && (
                      <>
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                        <Label htmlFor="isActive">{t('services.active')}</Label>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" className="hover:bg-muted hover:text-foreground focus:text-foreground active:text-foreground" onClick={() => setIsDialogOpen(false)}>
                      {t('services.cancel')}
                    </Button>
                    <Button type="submit">{editingService ? t('services.save') : t('services.create')}</Button>
                </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('services.table.service')}</TableHead>
                  <TableHead>{t('services.table.description')}</TableHead>
                  <TableHead>{t('services.table.price')}</TableHead>
                  <TableHead>{t('services.table.duration')}</TableHead>
                  <TableHead>{t('services.table.status')}</TableHead>
                  <TableHead className="text-right">{t('services.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('services.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{service.description.length > 60 ? service.description.slice(0, 60) + "…" : service.description}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(service.price, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>{service.duration} min</TableCell>
                      <TableCell>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button
                            size="icon-sm"
                            className={`${service.isActive ? "bg-success text-white hover:bg-success/90" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`}
                            onClick={() => handleToggleActive(service.id)}
                            aria-label={service.isActive ? t('common.deactivate') : t('common.activate')}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="icon-sm"
                            className="bg-warning text-white hover:bg-warning/90"
                            onClick={() => handleEdit(service)}
                            aria-label={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => requestDelete(service.id)}
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
          title={t('services.deleteTitle')}
          description={t('services.deleteDesc')}
          confirmText={t('common.remove')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  )
}
