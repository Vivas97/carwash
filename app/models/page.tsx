"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { store } from "@/lib/store"
import type { Brand, CarModel } from "@/lib/types"
import { Plus, Edit, Trash2, Power, Search } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDate } from "@/lib/utils"

export default function ModelsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CarModel | null>(null)
  const [models, setModels] = useState<CarModel[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formData, setFormData] = useState({
    name: "",
    brandId: "",
    isActive: true,
  })

  const filtered = useMemo(() => {
    return models.filter((m) => {
      const byBrand = selectedBrandFilter === "all" || m.brandId === selectedBrandFilter
      const bySearch = m.name.toLowerCase().includes(search.toLowerCase())
      return byBrand && bySearch
    })
  }, [models, selectedBrandFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = formData.name.trim()
    if (!formData.brandId) {
      alert("Seleccione una marca")
      return
    }
    if (!name) {
      alert("Ingrese el nombre del modelo")
      return
    }
    const payload = { name, brandId: formData.brandId, isActive: formData.isActive }
    try {
      if (editing) {
        const res = await fetch(`/api/models/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Error al actualizar el modelo")
      } else {
        const res = await fetch(`/api/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Error al crear el modelo")
      }
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadModels()
    setIsDialogOpen(false)
    setEditing(null)
    setFormData({ name: "", brandId: selectedBrandFilter !== "all" ? selectedBrandFilter : "", isActive: true })
  }

  const handleEdit = (model: CarModel) => {
    setEditing(model)
    setFormData({ name: model.name, brandId: model.brandId, isActive: model.isActive })
    setIsDialogOpen(true)
  }

  const requestDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/models/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar el modelo")
    } catch (err) {
      alert((err as Error).message)
      return
    }
    const res = await fetch(`/api/models`)
    const updated = await res.json()
    setModels(updated)
    const newTotal = Math.max(1, Math.ceil(updated.length / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  const handleToggleActive = async (id: string) => {
    const current = models.find((m) => m.id === id)
    if (!current) return
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current.isActive }),
      })
      if (!res.ok) throw new Error("Error al actualizar estado")
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadModels()
  }

  const loadModels = async () => {
    const res = await fetch(`/api/models`)
    const data = await res.json()
    setModels(data)
  }

  const loadBrands = async () => {
    const res = await fetch(`/api/brands`)
    const data = await res.json()
    setBrands(data)
  }

  useEffect(() => {
    loadModels()
    loadBrands()
  }, [])

  useEffect(() => {
    setPage(1)
    loadBrands()
  }, [search, selectedBrandFilter])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('models.title')} description={t('models.description')} />
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t('models.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="w-64">
              <Select value={selectedBrandFilter} onValueChange={setSelectedBrandFilter}>
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue placeholder={t('models.allBrands')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('models.allBrands')}</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (open) {
                  if (!editing) {
                    setFormData({ name: "", brandId: selectedBrandFilter !== "all" ? selectedBrandFilter : "", isActive: true })
                  }
                } else {
                  setEditing(null)
                  setFormData({ name: "", brandId: "", isActive: true })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditing(null)
                  setFormData({ name: "", brandId: selectedBrandFilter !== "all" ? selectedBrandFilter : "", isActive: true })
                }}>
                  <Plus className="h-4 w-4 mr-2" /> {t('models.new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-6">
                <DialogHeader>
                  <DialogTitle>{editing ? t('models.edit') : t('models.new')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="mb-2">{t('models.brand')}</Label>
                    <Select value={formData.brandId} onValueChange={(value) => setFormData({ ...formData, brandId: value })}>
                      <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                        <SelectValue placeholder={t('models.selectBrand')} />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="mb-2">{t('models.name')}</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                    <Button type="submit">{editing ? t('models.save') : t('models.create')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('models.table.model')}</TableHead>
                  <TableHead>{t('models.table.brand')}</TableHead>
                  <TableHead>{t('models.table.status')}</TableHead>
                  <TableHead>{t('models.table.date')}</TableHead>
                  <TableHead className="text-right">{t('models.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('models.empty')}</TableCell>
                  </TableRow>
                ) : (
                  paginated.map((m) => {
                    const brandName = brands.find((b) => b.id === m.brandId)?.name || "—"
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{brandName}</TableCell>
                        <TableCell>
                          <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? t('common.active') : t('common.inactive')}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(new Date(m.createdAt))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 items-center">
                            <Button size="icon-sm" className={`${m.isActive ? "bg-success text-white hover:bg-success/90" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`} onClick={() => handleToggleActive(m.id)} aria-label={m.isActive ? t('common.deactivate') : t('common.activate')}><Power className="h-4 w-4" /></Button>
                            <Button variant="default" size="icon-sm" className="bg-warning text-white hover:bg-warning/90" onClick={() => handleEdit(m)} aria-label={t('common.edit')}><Edit className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon-sm" onClick={() => requestDelete(m.id)} aria-label={t('common.remove')}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>{"<"}</Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1
                return (
                  <Button key={n} variant={page === n ? "default" : "outline"} size="sm" onClick={() => setPage(n)}>{n}</Button>
                )
              })}
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>{">"}</Button>
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('models.deleteTitle')}
          description={t('models.deleteDesc')}
          confirmText={t('common.remove')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  )
}
