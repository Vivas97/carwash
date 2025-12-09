"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
// import { store } from "@/lib/store"
import type { Brand } from "@/lib/types"
import { Plus, Edit, Trash2, Power, Search } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDate } from "@/lib/utils"

export default function BrandsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  })

  const filtered = brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: formData.name.trim(), isActive: formData.isActive }
    try {
      if (editing) {
        const res = await fetch(`/api/brands/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Error al actualizar")
      } else {
        const res = await fetch(`/api/brands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Error al crear")
      }
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadBrands()
    setIsDialogOpen(false)
    setEditing(null)
    setFormData({ name: "", isActive: true })
  }

  const handleEdit = (b: Brand) => {
    setEditing(b)
    setFormData({ name: b.name, isActive: b.isActive })
    setIsDialogOpen(true)
  }

  const requestDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/brands/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadBrands()
    const newTotal = Math.max(1, Math.ceil(brands.length / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  const handleToggleActive = async (id: string) => {
    const current = brands.find((b) => b.id === id)
    if (!current) return
    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current.isActive }),
      })
      if (!res.ok) throw new Error("Error al actualizar estado")
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadBrands()
  }

  const loadBrands = async () => {
    const res = await fetch(`/api/brands`)
    const data = await res.json()
    setBrands(data)
  }

  useEffect(() => {
    loadBrands()
    setPage(1)
  }, [search])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('brands.title')} description={t('brands.description')} />
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t('brands.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full" />
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditing(null)
                  setFormData({ name: "", isActive: true })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" /> {t('brands.new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-6">
                <DialogHeader>
                  <DialogTitle>{editing ? t('brands.edit') : t('brands.new')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="mb-2">{t('brands.name')}</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                    <Button type="submit">{editing ? t('brands.save') : t('brands.create')}</Button>
                </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('brands.table.name')}</TableHead>
                  <TableHead>{t('brands.table.status')}</TableHead>
                  <TableHead>{t('brands.table.date')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t('brands.empty')}</TableCell>
                  </TableRow>
                ) : (
                  paginated.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <Badge variant={b.isActive ? "default" : "secondary"}>{b.isActive ? t('common.active') : t('common.inactive')}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(b.createdAt))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button size="icon-sm" className={`${b.isActive ? "bg-success text-white hover:bg-success/90" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`} onClick={() => handleToggleActive(b.id)} aria-label={b.isActive ? t('common.deactivate') : t('common.activate')}><Power className="h-4 w-4" /></Button>
                          <Button variant="default" size="icon-sm" className="bg-warning text-white hover:bg-warning/90" onClick={() => handleEdit(b)} aria-label={t('common.edit')}><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon-sm" onClick={() => requestDelete(b.id)} aria-label={t('common.remove')}><Trash2 className="h-4 w-4" /></Button>
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
          title={t('brands.deleteTitle')}
          description={t('brands.deleteDesc')}
          confirmText={t('common.remove')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  )
}
