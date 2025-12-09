"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { store } from "@/lib/store"
import type { Vehicle } from "@/lib/types"
import { Search, History, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default function VehiclesPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const requestDelete = (id: string) => {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/vehicles/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar vehículo')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    const updatedRes = await fetch('/api/vehicles')
    const updated = await updatedRes.json()
    setVehicles(updated)
    const filteredCount = updated.filter(
      (v: Vehicle) =>
        (!brandFilter || brandFilter === "all" || v.brand === brandFilter) &&
        (v.vin.toLowerCase().includes(search.toLowerCase()) ||
          v.internalCode.toLowerCase().includes(search.toLowerCase()) ||
          v.brand.toLowerCase().includes(search.toLowerCase()) ||
          v.model.toLowerCase().includes(search.toLowerCase())),
    ).length
    const newTotal = Math.max(1, Math.ceil(filteredCount / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      setVehicles(data)
      setPage(1)
    })()
  }, [search, brandFilter])

  const filteredVehicles = vehicles.filter(
    (v) =>
      (!brandFilter || brandFilter === "all" || v.brand === brandFilter) &&
      (v.vin.toLowerCase().includes(search.toLowerCase()) ||
        v.internalCode.toLowerCase().includes(search.toLowerCase()) ||
        v.brand.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase())),
  )

  const brands = Array.from(new Set(vehicles.map((v) => v.brand))).sort()
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const paginatedVehicles = filteredVehicles.slice((page - 1) * pageSize, page * pageSize)


  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('vehicles.title')} description={t('vehicles.description')} />
        <div className="p-6">
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-[2] w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('vehicles.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 max-w-[220px]">
              <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v)}>
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue placeholder={t('vehicles.allBrands')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('vehicles.allBrands')}</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vehicles.table.internalCode')}</TableHead>
                  <TableHead>{t('vehicles.table.vin')}</TableHead>
                  <TableHead>{t('vehicles.table.brand')}</TableHead>
                  <TableHead>{t('vehicles.table.model')}</TableHead>
                  <TableHead>{t('vehicles.table.color')}</TableHead>
                  <TableHead>{t('vehicles.table.year')}</TableHead>
                  <TableHead>{t('vehicles.table.date')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('vehicles.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.internalCode}</TableCell>
                      <TableCell className="font-mono text-sm">{vehicle.vin}</TableCell>
                      <TableCell>{vehicle.brand}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.color}</TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{formatDate(new Date(vehicle.createdAt))}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button asChild variant="secondary" size="icon-sm" aria-label={t('vehicles.history')}>
                          <Link href={`/vehicles/historial?id=${vehicle.id}`}>
                            <History className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="destructive" size="icon-sm" onClick={() => requestDelete(vehicle.id)} aria-label={t('common.remove')}>
                          <Trash className="h-4 w-4" />
                        </Button>
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
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t('vehicles.deleteTitle')}
            description={t('vehicles.deleteDesc')}
            confirmText={t('common.remove')}
            cancelText={t('common.cancel')}
            onConfirm={confirmDelete}
          />
        </div>
      </main>

    </div>
  )
}
