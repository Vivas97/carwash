"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { store } from "@/lib/store"
import { FileDown, Search, Car, User, Calendar, Eye } from "lucide-react"
import Link from "next/link"
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils"

export default function ReportsPage() {
  const { t, lang } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"ingresos" | "empleados" | "vehiculos" | "ubicaciones">("ingresos")
  const pageSize = 10

  const [entries, setEntries] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])

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

  // Filter entries based on date and dynamic search by current filtro
  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      q === "" ||
      (activeTab === "ingresos" && (
        (entry.vehicle?.vin?.toLowerCase().includes(q) ||
          entry.vehicle?.internalCode?.toLowerCase().includes(q) ||
          (entry.employee?.name?.toLowerCase().includes(q) ?? false) ||
          (entry.service?.name?.toLowerCase().includes(q) ?? false))
      )) ||
      (activeTab === "vehiculos" && (
        (entry.vehicle?.vin?.toLowerCase().includes(q) ||
          entry.vehicle?.internalCode?.toLowerCase().includes(q) ||
          `${entry.vehicle?.brand ?? ""} ${entry.vehicle?.model ?? ""}`.toLowerCase().includes(q))
      )) ||
      (activeTab === "empleados" && ((entry.employee?.name?.toLowerCase().includes(q)) ?? false)) ||
      (activeTab === "ubicaciones" && (((locations.find((l: any) => l.id === entry.employee?.locationId)?.name || "").toLowerCase().includes(q)) ?? false))

    const entryDate = new Date(entry.arrivalDate)
    entryDate.setHours(0, 0, 0, 0)
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    const matchesFrom = !from || entryDate.getTime() >= from.getTime()
    const matchesTo = !to || entryDate.getTime() <= to.getTime()

    return matchesSearch && matchesFrom && matchesTo
  })

  const totalRevenue = filteredEntries.reduce((acc, e) => acc + (e.service?.price || 0), 0)
  const completedCount = filteredEntries.filter((e) => e.status === "completed").length
  const ticketAvg = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0
  const techniciansCount = employees.filter((e) => e.role === "technician").length
  const uniqueVehiclesCount = new Set(filteredEntries.map((e) => e.vehicleId).filter(Boolean)).size

  const employeeStats = employees
    .filter((e) => e.role === "technician")
    .map((employee) => {
      const list = filteredEntries.filter((en) => en.employeeId === employee.id)
      const completed = list.filter((en) => en.status === "completed").length
      const revenue = list.reduce((acc, en) => acc + (en.service?.price || 0), 0)
      const avg = completed > 0 ? Math.round(revenue / completed) : 0
      return { id: employee.id, name: employee.name, completed, revenue, avg }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const vehicleStats = Object.values(
    filteredEntries.reduce((map: Record<string, any>, en) => {
      const id = en.vehicleId
      if (!id) return map
      const curr = map[id] || {
        vehicleId: id,
        brand: en.vehicle?.brand,
        model: en.vehicle?.model,
        vin: en.vehicle?.vin,
        internalCode: en.vehicle?.internalCode,
        count: 0,
        revenue: 0,
        lastDate: en.arrivalDate,
      }
      curr.count += 1
      curr.revenue += en.service?.price || 0
      if (new Date(en.arrivalDate).getTime() > new Date(curr.lastDate).getTime()) curr.lastDate = en.arrivalDate
      map[id] = curr
      return map
    }, {})
  ).sort((a: any, b: any) => b.revenue - a.revenue)

  const loadData = async () => {
    const [eRes, empRes, vRes, lRes] = await Promise.all([
      fetch('/api/entries'),
      fetch('/api/employees'),
      fetch('/api/vehicles'),
      fetch('/api/locations'),
    ])
    async function safeJson<T>(res: Response, fallback: T): Promise<T> {
      try { return res.ok ? ((await res.json()) as T) : fallback } catch { return fallback }
    }
    const eData = await safeJson<any[]>(eRes, [])
    const empData = await safeJson<any[]>(empRes, [])
    const vData = await safeJson<any[]>(vRes, [])
    const lData = await safeJson<any[]>(lRes, [])
    setEntries(eData)
    setEmployees(empData)
    setVehicles(vData)
    setLocations(lData)
  }

  useEffect(() => {
    loadData()
  }, [searchQuery, activeTab, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
  const paginatedEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize)

  // Calculate productivity stats
  const productivityStats = employees
    .filter((e) => e.role === "technician")
    .map((employee) => {
      const employeeEntries = entries.filter((e) => e.employeeId === employee.id)
      const completed = employeeEntries.filter((e) => e.status === "completed").length
      const revenue = employeeEntries
        .filter((e) => e.status === "completed")
        .reduce((acc, entry) => acc + (entry.service?.price || 0), 0)

      return {
        ...employee,
        completedThisPeriod: completed,
        revenue,
      }
    })
    .sort((a, b) => b.completedThisPeriod - a.completedThisPeriod)

  const handleExportPDF = () => {
    alert("Exportando a PDF... (funcionalidad simulada)")
  }

  const handleExportExcel = async () => {
    const mod = await import('xlsx-js-style')
    const XLSX: any = (mod as any).default || mod
    const dateTag = new Date().toISOString().slice(0, 10)
    const wb: any = XLSX.utils.book_new()
    wb.Props = { Title: `${t('nav.reports')} ${dateTag}`, CreatedDate: new Date() }
    const currency = (typeof window !== 'undefined' ? (localStorage.getItem('settings:currency') || null) : null) || (lang === 'en' ? 'USD' : 'COP')
    function makeSheet(headers: string[], rows: any[][], colWidths: number[], numCols: Record<number, string>) {
      const aoa = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = colWidths.map((w) => ({ wpx: w }))
      ws['!rows'] = [{ hpt: 18 }]
      const ref = ws['!ref'] || XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } })
      const range = XLSX.utils.decode_range(ref)
      const headerStyle = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: 'F3F4F6' } }, border: { top: { style: 'thin', color: { rgb: 'E5E7EB' } }, left: { style: 'thin', color: { rgb: 'E5E7EB' } }, right: { style: 'thin', color: { rgb: 'E5E7EB' } }, bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } } }
      const rowStyle = { font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'E5E7EB' } }, left: { style: 'thin', color: { rgb: 'E5E7EB' } }, right: { style: 'thin', color: { rgb: 'E5E7EB' } }, bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } } }
      const rowAltStyle = { ...rowStyle, fill: { fgColor: { rgb: 'FAFAFA' } } }
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: range.s.r, c })
        if (ws[addr]) ws[addr].s = headerStyle as any
      }
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const isAlt = (r - 1) % 2 === 1
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell) cell.s = (isAlt ? rowAltStyle : rowStyle) as any
        }
      }
      Object.entries(numCols).forEach(([ci, fmt]) => {
        const c = Number(ci)
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell && typeof cell.v === 'number') cell.z = fmt
        }
      })
      ws['!autofilter'] = { ref }
      ;(ws as any)['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
      return ws
    }
    const resumenHeaders = [t('reports.export.metric'), t('reports.export.value')]
    const resumenRows = [
      [t('dashboard.totalRevenue'), totalRevenue],
      [t('reports.card.completedOrders'), completedCount],
      [`${t('reports.card.ticketAvg')} (${currency})`, ticketAvg],
      [t('reports.card.technicians'), techniciansCount],
      [t('reports.card.uniqueVehicles'), uniqueVehiclesCount],
      [t('reports.export.generated'), formatDateTime(new Date())],
    ]
    const resumenWs = makeSheet(resumenHeaders, resumenRows, [200, 160], { 1: "#,##0" })
    XLSX.utils.book_append_sheet(wb, resumenWs, t('reports.sheet.summary'))
    const ingresosHeaders = [t('reports.table.date'), t('vehicles.table.brand'), t('vehicles.table.model'), t('reports.table.vin'), t('reports.table.internalCode'), t('reports.table.service'), t('reports.table.technician'), t('reports.table.status'), `${t('reports.table.price')} (${currency})`]
    const ingresosRows = filteredEntries.map((entry) => {
      const d = entry?.arrivalDate ? new Date(entry.arrivalDate) : null
      const fecha = d && !isNaN(d.getTime()) ? formatDate(d) : ""
      return [
        fecha,
        entry.vehicle?.brand ?? "",
        entry.vehicle?.model ?? "",
        entry.vehicle?.vin ?? "",
        entry.vehicle?.internalCode ?? "",
        entry.service?.name ?? "",
        entry.employee?.name ?? "",
        statusLabels[entry.status as keyof typeof statusLabels] ?? entry.status ?? "",
        Number(entry.service?.price ?? 0),
      ]
    })
    ingresosRows.push([t('common.total'), "", "", "", "", "", "", "", ingresosRows.reduce((s, r) => s + (Number(r[8]) || 0), 0)])
    const ingresosWs = makeSheet(ingresosHeaders, ingresosRows, [100, 120, 140, 180, 120, 160, 140, 110, 120], { 8: "#,##0" })
    XLSX.utils.book_append_sheet(wb, ingresosWs, t('reports.sheet.revenue'))
    const empleadosHeaders = [t('reports.table.employee'), t('reports.table.orders'), `${t('reports.table.revenue')} (${currency})`, `${t('reports.table.ticketAvg')} (${currency})`]
    const empleadosRows = employeeStats.map((e) => [e.name, Number(e.completed), Number(e.revenue), Number(e.avg)])
    empleadosRows.push([t('common.total'), empleadosRows.reduce((s, r) => s + (Number(r[1]) || 0), 0), empleadosRows.reduce((s, r) => s + (Number(r[2]) || 0), 0), ""]) 
    const empleadosWs = makeSheet(empleadosHeaders, empleadosRows, [180, 100, 140, 160], { 1: "#,##0", 2: "#,##0", 3: "#,##0" })
    XLSX.utils.book_append_sheet(wb, empleadosWs, t('reports.sheet.employees'))
    const vehiculosHeaders = [t('vehicles.table.brand'), t('vehicles.table.model'), t('vehicles.table.vin'), t('vehicles.table.internalCode'), t('reports.table.orders'), `${t('reports.table.revenue')} (${currency})`, t('reports.table.lastEntry')]
    const vehiculosRows = (vehicleStats as any[]).map((v) => {
      const d = v?.lastDate ? new Date(v.lastDate) : null
      const fecha = d && !isNaN(d.getTime()) ? formatDate(d) : ""
      return [v.brand ?? "", v.model ?? "", v.vin ?? "", v.internalCode ?? "", Number(v.count ?? 0), Number(v.revenue ?? 0), fecha]
    })
    vehiculosRows.push([t('common.total'), "", "", "", vehiculosRows.reduce((s, r) => s + (Number(r[4]) || 0), 0), vehiculosRows.reduce((s, r) => s + (Number(r[5]) || 0), 0), ""]) 
    const vehiculosWs = makeSheet(vehiculosHeaders, vehiculosRows, [120, 140, 180, 120, 110, 140, 120], { 4: "#,##0", 5: "#,##0" })
    XLSX.utils.book_append_sheet(wb, vehiculosWs, t('reports.sheet.vehicles'))
    const ubicHeaders = [t('reports.table.location'), t('reports.table.orders'), `${t('reports.table.revenue')} (${currency})`]
    const statsObj = filteredEntries.reduce((map: any, en: any) => {
      const id = en.employee?.locationId || "unknown"
      const loc = locations.find((l: any) => l.id === id)
      const curr = map[id] || { name: loc?.name || t('common.noLocation'), count: 0, revenue: 0 }
      curr.count += 1
      curr.revenue += en.service?.price || 0
      map[id] = curr
      return map
    }, {})
    const statsArr = Object.values(statsObj).sort((a: any, b: any) => (b.revenue ?? 0) - (a.revenue ?? 0)) as any[]
    const ubicRows = statsArr.map((l: any) => [l.name, Number(l.count ?? 0), Number(l.revenue ?? 0)])
    ubicRows.push([t('common.total'), ubicRows.reduce((s, r) => s + (Number(r[1]) || 0), 0), ubicRows.reduce((s, r) => s + (Number(r[2]) || 0), 0)])
    const ubicWs = makeSheet(ubicHeaders, ubicRows, [180, 110, 140], { 1: "#,##0", 2: "#,##0" })
    XLSX.utils.book_append_sheet(wb, ubicWs, t('reports.sheet.locations'))
    XLSX.writeFile(wb, `${t('nav.reports')}_${dateTag}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main style={{ paddingLeft: "var(--sidebar-width, 16rem)" }}>
        <Header title={t('reports.title')} description={t('reports.description')} />
        <div className="p-6">
          <div className="space-y-6">
            <div className="space-y-6">
              {activeTab === "ingresos" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.revenue')}</p>
                    <p className="text-2xl font-semibold">{formatCurrency(totalRevenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.completedOrders')}</p>
                    <p className="text-2xl font-semibold">{completedCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.ticketAvg')}</p>
                    <p className="text-2xl font-semibold">{formatCurrency(ticketAvg, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
              {activeTab === "empleados" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.technicians')}</p>
                    <p className="text-2xl font-semibold">{techniciansCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.completedOrders')}</p>
                    <p className="text-2xl font-semibold">{completedCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.revenue')}</p>
                    <p className="text-2xl font-semibold">{formatCurrency(totalRevenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
              {activeTab === "vehiculos" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.uniqueVehicles')}</p>
                    <p className="text-2xl font-semibold">{uniqueVehiclesCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.completedOrders')}</p>
                    <p className="text-2xl font-semibold">{completedCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.revenue')}</p>
                    <p className="text-2xl font-semibold">{formatCurrency(totalRevenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
              {activeTab === "ubicaciones" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.locations')}</p>
                    <p className="text-2xl font-semibold">{locations.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.orders')}</p>
                    <p className="text-2xl font-semibold">{filteredEntries.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{t('reports.card.revenue')}</p>
                    <p className="text-2xl font-semibold">{formatCurrency(totalRevenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="default" className="bg-success text-white hover:bg-success/90" onClick={handleExportExcel}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {t('common.exportExcel')}
                </Button>
              </div>
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <Label className="mb-2">{activeTab === "empleados" ? t('reports.search.employee') : activeTab === "ingresos" ? t('reports.search.order') : activeTab === "ubicaciones" ? t('reports.search.location') : t('reports.search.vehicle')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={activeTab === "empleados" ? t('reports.placeholder.employee') : activeTab === "ingresos" ? t('reports.placeholder.order') : activeTab === "ubicaciones" ? t('reports.placeholder.location') : t('reports.placeholder.vehicle')}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="pl-9 w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <Label className="mb-2">{t('reports.filterBy')}</Label>
                  <Select value={activeTab} onValueChange={(val) => { setActiveTab(val as any); setPage(1) }}>
                    <SelectTrigger className="w-full bg-muted border-border focus-visible:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingresos">{lang === 'en' ? 'Orders' : 'Ingresos'}</SelectItem>
                      <SelectItem value="empleados">{t('nav.employees')}</SelectItem>
                      <SelectItem value="vehiculos">{t('nav.vehicles')}</SelectItem>
                      <SelectItem value="ubicaciones">{t('nav.locations')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-3 w-full sm:w-auto max-w-[22.5rem] sm:max-w-none">
                  <Label className="mb-2">{t('reports.from')}</Label>
                  <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="w-full h-9" />
                </div>
                <div className="col-span-12 sm:col-span-3 w-full sm:w-auto max-w-[22.5rem] sm:max-w-none">
                  <Label className="mb-2">{t('reports.to')}</Label>
                  <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="w-full h-9" />
                </div>
                <div className="col-span-12"></div>
              </div>

              {activeTab === "ingresos" && (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.table.date')}</TableHead>
                        <TableHead>{t('reports.table.vehicle')}</TableHead>
                        <TableHead>{t('reports.table.vin')}</TableHead>
                        <TableHead>{t('reports.table.internalCode')}</TableHead>
                        <TableHead>{t('reports.table.service')}</TableHead>
                        <TableHead>{t('reports.table.technician')}</TableHead>
                        <TableHead>{t('reports.table.status')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.price')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('reports.empty')}</TableCell>
                        </TableRow>
                      ) : (
                        paginatedEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDate(new Date(entry.arrivalDate))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{entry.vehicle?.brand} {entry.vehicle?.model}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{entry.vehicle?.vin}</TableCell>
                            <TableCell className="text-xs">{entry.vehicle?.internalCode}</TableCell>
                            <TableCell>{entry.service?.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {entry.employee?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("border", statusColors[entry.status as keyof typeof statusColors])}>{statusLabels[entry.status as keyof typeof statusLabels]}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(entry.service?.price || 0, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/vehicles/historial?id=${entry.vehicleId}`}>
                                  <Button size="icon" aria-label={t('orders.viewDetails')} className="bg-muted text-card-foreground hover:bg-muted/80 border border-border"><Eye className="h-4 w-4" /></Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "empleados" && (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.table.employee')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.orders')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.revenue')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.ticketAvg')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t('reports.empty')}</TableCell>
                        </TableRow>
                      ) : (
                        employeeStats.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{e.name}</TableCell>
                            <TableCell className="text-right">{e.completed}</TableCell>
                            <TableCell className="text-right">{formatCurrency(e.revenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(e.avg, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "vehiculos" && (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.table.vehicle')}</TableHead>
                        <TableHead>{t('reports.table.vin')}</TableHead>
                        <TableHead>{t('reports.table.internalCode')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.orders')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.revenue')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.lastEntry')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('reports.empty')}</TableCell>
                        </TableRow>
                      ) : (
                        vehicleStats.map((v: any) => (
                          <TableRow key={v.vehicleId}>
                            <TableCell className="font-medium">{v.brand} {v.model}</TableCell>
                            <TableCell className="font-mono text-xs">{v.vin}</TableCell>
                            <TableCell className="text-xs">{v.internalCode}</TableCell>
                            <TableCell className="text-right">{v.count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(v.revenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-right">{formatDate(new Date(v.lastDate))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              {activeTab === "ubicaciones" && (
                <div className="rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.table.location')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.orders')}</TableHead>
                        <TableHead className="text-right">{t('reports.table.revenue')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const stats = Object.values(
                          filteredEntries.reduce((map: Record<string, any>, en) => {
                            const id = en.employee?.locationId || 'unknown'
                            const loc = locations.find((l: any) => l.id === id)
                            const curr = map[id] || {
                              locationId: id,
                              name: loc?.name || (lang === 'en' ? 'No location' : 'Sin ubicación'),
                              count: 0,
                              revenue: 0,
                            }
                            curr.count += 1
                            curr.revenue += en.service?.price || 0
                            map[id] = curr
                            return map
                          }, {})
                        ).sort((a: any, b: any) => b.revenue - a.revenue) as any[]
                        return stats.length === 0 ? (
                          <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">{t('reports.empty')}</TableCell>
                          </TableRow>
                        ) : (
                          stats.map((l: any) => (
                            <TableRow key={l.locationId}>
                              <TableCell className="font-medium">{l.name}</TableCell>
                              <TableCell className="text-right">{l.count}</TableCell>
                              <TableCell className="text-right">{formatCurrency(l.revenue, undefined, undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                            </TableRow>
                          ))
                        )
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
              {activeTab === "ingresos" && (
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
