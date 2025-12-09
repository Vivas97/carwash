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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { store } from "@/lib/store"
import type { Employee } from "@/lib/types"
import { Plus, Search, Edit, Trash2, User, Power } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

export default function EmployeesPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [locations, setLocations] = useState<any[]>([])
  const pageSize = 10

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    role: "technician" as Employee["role"],
    locationId: "",
  })

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || e.role === roleFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? e.isActive : !e.isActive)
    return matchesSearch && matchesRole && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const roleColors = {
    admin: "bg-destructive/20 text-destructive border-destructive/30",
    technician: "bg-primary/20 text-primary border-primary/30",
  }

  const roleLabels = {
    admin: "Administrador",
    technician: "Técnico",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingEmployee) {
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, email: formData.email, username: formData.username, phone: formData.phone, role: formData.role, locationId: formData.locationId, isActive: true, password: formData.password }),
        })
        if (!res.ok) throw new Error('Error al actualizar empleado')
      } else {
        const res = await fetch(`/api/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, email: formData.email, username: formData.username, password: formData.password, phone: formData.phone, role: formData.role, locationId: formData.locationId, isActive: true }),
        })
        if (!res.ok) throw new Error('Error al crear empleado')
      }
    } catch (err) {
      alert((err as Error).message)
      return
    }

    await loadEmployees()
    setIsDialogOpen(false)
    setEditingEmployee(null)
    setFormData({ name: "", email: "", username: "", password: "", phone: "", role: "technician", locationId: "" })
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      username: (employee as any).username || "",
      password: "",
      phone: employee.phone,
      role: employee.role,
      locationId: employee.locationId,
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
      const res = await fetch(`/api/employees/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar empleado')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadEmployees()
    const filteredCount = employees.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === "all" || e.role === roleFilter
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? e.isActive : !e.isActive)
      return matchesSearch && matchesRole && matchesStatus
    }).length
    const newTotal = Math.max(1, Math.ceil(filteredCount / pageSize))
    if (page > newTotal) setPage(newTotal)
    setConfirmOpen(false)
    setDeleteId(null)
  }

  const handleToggleActive = async (id: string) => {
    const current = employees.find((e) => e.id === id)
    if (!current) return
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current.isActive }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
    } catch (err) {
      alert((err as Error).message)
      return
    }
    await loadEmployees()
  }

  const loadEmployees = async () => {
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(data)
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
    loadEmployees()
    loadLocations()
    setPage(1)
  }, [search, roleFilter, statusFilter])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('employees.title')} description={t('employees.description')} />
        <div className="p-6">
          {/* Actions */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative flex-[2] w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('employees.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                    <SelectValue placeholder={t('employees.allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allRoles')}</SelectItem>
                    <SelectItem value="admin">{t('role.admin')}</SelectItem>
                    <SelectItem value="technician">{t('role.technician')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                    <SelectValue placeholder={t('employees.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('employees.actives')}</SelectItem>
                    <SelectItem value="inactive">{t('employees.inactives')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditingEmployee(null)
                  setFormData({ name: "", email: "", username: "", password: "", phone: "", role: "technician", locationId: "" })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('employees.new')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-6 sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? t('employees.edit') : t('employees.new')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="mb-2">Nombre Completo *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="mb-2">Correo Electrónico *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="mb-2">Usuario *</Label>
                      <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="mb-2">Contraseña *</Label>
                      <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="mb-2">Teléfono *</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="mb-2">Rol *</Label>
                      <Select value={formData.role} onValueChange={(value: Employee["role"]) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="technician">Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="location" className="mb-2">Ubicación *</Label>
                      <Select value={formData.locationId} onValueChange={(value: string) => setFormData({ ...formData, locationId: value })}>
                        <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                          <SelectValue placeholder="Seleccionar ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingEmployee ? "Guardar Cambios" : "Crear Empleado"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('employees.table.employee')}</TableHead>
                  <TableHead>{t('employees.table.contact')}</TableHead>
                  <TableHead>{t('employees.table.role')}</TableHead>
                  <TableHead>{t('employees.table.location')}</TableHead>
                  <TableHead>{t('employees.table.completed')}</TableHead>
                  <TableHead>{t('employees.table.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t('employees.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                            <User className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Desde {new Date(employee.createdAt).toLocaleDateString("es-MX")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{employee.email}</p>
                        <p className="text-sm text-muted-foreground">{employee.phone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", roleColors[employee.role as keyof typeof roleColors])}>
                          {employee.role === 'admin' ? t('role.admin') : t('role.technician')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {locations.find((l) => l.id === employee.locationId)?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{employee.completedServices}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                          {employee.isActive ? t('employees.actives') : t('employees.inactives')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <Button
                            size="icon-sm"
                            className={`${employee.isActive ? "bg-success text-white hover:bg-success/90" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`}
                            onClick={() => handleToggleActive(employee.id)}
                            aria-label={employee.isActive ? t('common.deactivate') : t('common.activate')}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="icon-sm"
                            className="bg-warning text-white hover:bg-warning/90"
                            onClick={() => handleEdit(employee)}
                            aria-label={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => requestDelete(employee.id)}
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
          title={t('employees.deleteTitle')}
          description={t('employees.deleteDesc')}
          confirmText={t('common.remove')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
        />
      </main>
    </div>
  )
}
