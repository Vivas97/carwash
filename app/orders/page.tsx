"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { store } from "@/lib/store"
import { Car, User, Calendar, Play, CheckCircle, Search, NotebookPen, Eye } from "lucide-react"
import Link from "next/link"
import { cn, formatDate, formatTime } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
 

export default function OrdersPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeEntryId, setCompleteEntryId] = useState<string | null>(null)
  const [finalNotes, setFinalNotes] = useState("")
  const [finalPhotos, setFinalPhotos] = useState<string[]>([])

  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateEntryId, setUpdateEntryId] = useState<string | null>(null)
  const [updateText, setUpdateText] = useState("")
  const [updatePhotos, setUpdatePhotos] = useState<string[]>([])
  const updateGalleryRef = useRef<HTMLInputElement | null>(null)
  const updateCamRef = useRef<HTMLInputElement | null>(null)

  const [entries, setEntries] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any | null>(null)

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

  const filtered = entries.filter((entry) => {
    const matchesSearch =
      search === "" ||
      entry.vehicle?.vin.toLowerCase().includes(search.toLowerCase()) ||
      entry.vehicle?.internalCode.toLowerCase().includes(search.toLowerCase()) ||
      entry.vehicle?.brand.toLowerCase().includes(search.toLowerCase()) ||
      entry.vehicle?.model.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "all" || entry.status === statusFilter
    const matchesEmployee = employeeFilter === "all" || entry.employeeId === employeeFilter
    return matchesSearch && matchesStatus && matchesEmployee
  })

  const loadMe = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const me = await res.json()
      setCurrentUser(me)
      if (me?.role === 'technician' && me?.id) {
        setEmployeeFilter(String(me.id))
      }
    } catch {}
  }

  const loadEntries = async () => {
    const res = await fetch('/api/entries')
    const data = await res.json()
    setEntries(data)
  }

  const loadEmployees = async () => {
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(data)
  }

  useEffect(() => {
    loadMe()
    loadEntries()
    loadEmployees()
    setPage(1)
  }, [search, statusFilter, employeeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const startOrder = async (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry || entry.status !== "pending") return
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in-progress' }),
      })
      if (!res.ok) throw new Error('Error al iniciar orden')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadEntries()
    try {
      const detail = {
        type: 'status-change',
        message: `Orden en proceso: ${entry.vehicle?.brand} ${entry.vehicle?.model} (${entry.vehicle?.internalCode})`,
        date: new Date().toISOString(),
      }
      window.dispatchEvent(new CustomEvent('app:notify', { detail }))
    } catch {}
  }

  const completeOrder = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry || entry.status === "completed") return
    setCompleteEntryId(id)
    setFinalNotes("")
    setFinalPhotos([])
    setCompleteOpen(true)
  }

  const handleCompleteFiles = async (files: FileList | null) => {
    if (!files) return
    const toRead = Array.from(files).slice(0, 4 - finalPhotos.length)
    const readPromises = toRead.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        }),
    )
    const results = await Promise.all(readPromises)
    setFinalPhotos((prev) => [...prev, ...results].slice(0, 4))
  }

  const removeFinalPhoto = (index: number) => {
    setFinalPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmComplete = async () => {
    if (!completeEntryId) return
    const entry = entries.find((e) => e.id === completeEntryId)
    try {
      const res = await fetch(`/api/entries/${completeEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completionDate: new Date().toISOString(),
          finalPhotos,
          finalNotes,
        }),
      })
      if (!res.ok) throw new Error('Error al completar orden')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    setCompleteOpen(false)
    setCompleteEntryId(null)
    setFinalNotes("")
    setFinalPhotos([])
    await loadEntries()
    try {
      const detail = {
        type: 'completed',
        message: `Orden finalizada: ${entry?.vehicle?.brand} ${entry?.vehicle?.model} (${entry?.vehicle?.internalCode})`,
        date: new Date().toISOString(),
      }
      window.dispatchEvent(new CustomEvent('app:notify', { detail }))
    } catch {}
  }

  const handleUpdateFiles = async (files: FileList | null) => {
    if (!files) return
    const toRead = Array.from(files).slice(0, 4 - updatePhotos.length)
    const readPromises = toRead.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(file)
        }),
    )
    const results = await Promise.all(readPromises)
    setUpdatePhotos((prev) => [...prev, ...results].slice(0, 4))
  }

  const removeUpdatePhoto = (index: number) => {
    setUpdatePhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const openUpdateDialog = (id: string) => {
    setUpdateEntryId(id)
    setUpdateText("")
    setUpdatePhotos([])
    setUpdateOpen(true)
  }

  const confirmUpdate = async () => {
    if (!updateEntryId) return
    const text = updateText.trim()
    if (!text) return
    const entry = entries.find((e) => e.id === updateEntryId)
    try {
      const res = await fetch(`/api/entries/${updateEntryId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, photos: updatePhotos }),
      })
      if (!res.ok) throw new Error('Error al registrar novedad')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    setUpdateOpen(false)
    setUpdateEntryId(null)
    setUpdateText("")
    setUpdatePhotos([])
    await loadEntries()
    try {
      const detail = {
        type: 'update',
        message: `Novedad registrada: ${text} (${entry?.vehicle?.brand} ${entry?.vehicle?.model})`,
        date: new Date().toISOString(),
      }
      window.dispatchEvent(new CustomEvent('app:notify', { detail }))
    } catch {}
  }

 

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('orders.title')} description={t('orders.description')} />
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 sm:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('orders.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue placeholder={t('orders.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('status.pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('status.inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentUser?.role !== 'technician' && (
              <div className="col-span-6 sm:col-span-4">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                  <SelectValue placeholder={t('orders.employee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-12"></div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.table.date')}</TableHead>
                  <TableHead>{t('orders.table.vehicle')}</TableHead>
                  <TableHead>{t('orders.table.vin')}</TableHead>
                  <TableHead>{t('orders.table.internalCode')}</TableHead>
                  <TableHead>{t('orders.table.service')}</TableHead>
                  <TableHead>{t('orders.table.technician')}</TableHead>
                  <TableHead>{t('orders.table.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('orders.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(new Date(entry.arrivalDate))} {formatTime(new Date(entry.arrivalDate))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {entry.vehicle?.brand} {entry.vehicle?.model}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.vehicle?.vin}</TableCell>
                      <TableCell className="text-xs">{entry.vehicle?.internalCode}</TableCell>
                      <TableCell className="font-medium">{entry.service?.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {entry.employee?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", statusColors[entry.status as keyof typeof statusColors])}>
                          {entry.status === 'pending' ? t('status.pending') : entry.status === 'in-progress' ? t('status.inProgress') : t('status.completed')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {entry.status === "pending" && (
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => startOrder(entry.id)}
                              aria-label={t('orders.start')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="default"
                            className="bg-success text-white hover:bg-success/90"
                            size="icon"
                            onClick={() => completeOrder(entry.id)}
                            disabled={entry.status !== "in-progress"}
                            aria-label={t('orders.complete')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          {entry.status === "in-progress" && (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => openUpdateDialog(entry.id)}
                                aria-label={t('orders.registerUpdate')}
                              >
                                <NotebookPen className="h-4 w-4" />
                              </Button>
                              <Button asChild variant="secondary" size="icon" aria-label={t('orders.viewDetails')}>
                                <Link href={`/vehicles/historial?id=${entry.vehicleId}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </>
                          )}
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

          <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Completar orden</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="final-notes">Observaciones de salida</Label>
                  <Input
                    id="final-notes"
                    value={finalNotes}
                    onChange={(e) => setFinalNotes(e.target.value)}
                    placeholder="Notas finales..."
                  />
                </div>
                <div>
                  <div className="space-y-2">
                    <Label>Fotos de salida (máx. 4)</Label>
                    <Input type="file" accept="image/*" multiple onChange={(e) => handleCompleteFiles(e.target.files)} />
                  </div>
                  {finalPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {finalPhotos.map((src, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden border">
                          <img src={src} alt={`Foto salida ${i + 1}`} className="w-full h-32 object-cover" loading="lazy" />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeFinalPhoto(i)}
                          >
                            Quitar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setCompleteOpen(false)}>Cancelar</Button>
                  <Button onClick={confirmComplete}>Completar</Button>
                </div>
              </div>
          </DialogContent>
          </Dialog>

          <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Registrar novedad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="update-text">Detalle</Label>
                  <Input id="update-text" value={updateText} onChange={(e) => setUpdateText(e.target.value)} placeholder="Descripción de la novedad" />
                </div>
                <div className="space-y-2">
                  <Label>Fotos (máx. 4)</Label>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <input ref={updateGalleryRef} type="file" accept="image/*" multiple onChange={(e) => handleUpdateFiles(e.target.files)} className="hidden" />
                    <input ref={updateCamRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => handleUpdateFiles(e.target.files)} className="hidden" />
                    <Button variant="outline" className="hover:bg-muted w-full" onClick={() => updateGalleryRef.current?.click()}>Seleccionar</Button>
                    <Button variant="outline" className="hover:bg-muted w-full" onClick={() => updateCamRef.current?.click()}>Tomar foto</Button>
                  </div>
                </div>
                {updatePhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {updatePhotos.map((src, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border">
                        <img src={src} alt={`Foto novedad ${i + 1}`} className="w-full h-32 object-cover" loading="lazy" />
                        <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeUpdatePhoto(i)}>Quitar</Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setUpdateOpen(false)}>Cancelar</Button>
                  <Button onClick={confirmUpdate}>Guardar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
