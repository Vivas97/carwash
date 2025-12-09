import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

async function savePhotoToPublic(raw: string): Promise<string | null> {
  if (typeof raw !== "string" || raw.length === 0) return null
  if (raw.startsWith("/uploads/")) return raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (!raw.startsWith("data:")) return null
  try {
    const parts = raw.split(",")
    if (parts.length < 2) return null
    const meta = parts[0] // e.g., data:image/png;base64
    const base64 = parts[1]
    const mime = meta.split(":")[1]?.split(";")[0] || "image/png"
    let ext = mime.split("/")[1] || "png"
    if (ext === "jpeg") ext = "jpg"
    const crypto = await import("node:crypto")
    const path = await import("node:path")
    const fs = await import("node:fs/promises")
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`
    const primaryDir = path.join(process.cwd(), "public", "uploads")
    const fallbackStandaloneDir = path.join(process.cwd(), ".next", "standalone", "public", "uploads")
    let dir = primaryDir
    try {
      await fs.access(path.join(process.cwd(), "public"))
    } catch {
      dir = fallbackStandaloneDir
    }
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, name)
    await fs.writeFile(filePath, Buffer.from(base64, "base64"))
    return `/uploads/${name}`
  } catch {
    return null
  }
}

export async function GET() {
  let where: any = {}
  try {
    const store = await cookies()
    const raw = store.get("session")?.value
    if (raw) {
      const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
      if (data?.role === "technician" && data?.id) {
        where.employeeId = String(data.id)
      }
    }
  } catch {}
  const entries = await prisma.vehicleEntry.findMany({
    where,
    orderBy: { arrivalDate: "desc" },
    include: {
      vehicle: true,
      employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
      service: true,
      photos: true,
      updates: true,
    },
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { vehicleId: vehicleIdRaw, vehicle: vehicleRaw, employeeId: employeeIdInput, serviceId, status = "pending", arrivalDate, notes, initialPhotos = [] } = body || {}
  let vehicleId = vehicleIdRaw as string | undefined
  let employeeId = typeof employeeIdInput === "string" && employeeIdInput.length > 0 ? employeeIdInput : undefined

  async function ensureVehicle(): Promise<string | null> {
    if (vehicleId && typeof vehicleId === "string") return vehicleId
    const vObj = vehicleRaw || {}
    const vin: string | undefined = typeof vObj?.vin === "string" ? vObj.vin : undefined
    const internalCode: string | undefined = typeof vObj?.internalCode === "string" ? vObj.internalCode : undefined
    const brand: string | undefined = typeof vObj?.brand === "string" ? vObj.brand : undefined
    const model: string | undefined = typeof vObj?.model === "string" ? vObj.model : undefined
    const color: string | undefined = typeof vObj?.color === "string" ? vObj.color : undefined
    const yearVal: number | undefined = typeof vObj?.year === "number" ? vObj.year : (typeof vObj?.year === "string" ? Number(vObj.year) : undefined)
    if (!vin || !internalCode || !brand || !model || !color || !yearVal) return null
    const found = await prisma.vehicle.findFirst({ where: { OR: [{ vin }, { internalCode }] } })
    if (found) return found.id
    const created = await prisma.vehicle.create({ data: { vin, internalCode, brand, model, color, year: Number(yearVal) } })
    return created.id
  }

  vehicleId = await ensureVehicle() || undefined

  if (!employeeId) {
    try {
      const store = await cookies()
      const raw = store.get("session")?.value
      if (raw) {
        const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
        if (data?.id) employeeId = String(data.id)
      }
    } catch {}
  }

  if (!vehicleId || !employeeId || !serviceId || !arrivalDate) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const existingPending = await prisma.vehicleEntry.findFirst({
    where: { vehicleId, status: "pending" },
  })
  if (existingPending) {
    return NextResponse.json({ error: "Ya existe una orden pendiente para este vehículo" }, { status: 409 })
  }
  const entry = await prisma.vehicleEntry.create({
    data: { vehicleId, employeeId, serviceId, status, arrivalDate: new Date(arrivalDate), notes },
  })
  if (Array.isArray(initialPhotos) && initialPhotos.length > 0) {
    const saved = await Promise.all(initialPhotos.map((u: string) => savePhotoToPublic(u)))
    const valid = saved.filter((u): u is string => typeof u === "string" && u.length > 0)
    if (valid.length > 0) {
      await prisma.photo.createMany({
        data: valid.map((url: string) => ({ entryId: entry.id, type: "initial", url })),
      })
    }
  }
  const withInclude = await prisma.vehicleEntry.findUnique({
    where: { id: entry.id },
    include: {
      vehicle: true,
      employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
      service: true,
      photos: true,
      updates: true,
    },
  })
  return NextResponse.json(withInclude, { status: 201 })
}
