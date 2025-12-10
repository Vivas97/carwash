import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
import { cookies } from "next/headers"
export const runtime = 'nodejs'

async function savePhotoToPublic(raw: string): Promise<string | null> {
  if (typeof raw !== "string" || raw.length === 0) return null
  if (raw.startsWith("/uploads/")) return raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (!raw.startsWith("data:")) return null
  try {
    const res = await cloudinary.uploader.upload(raw, { folder: "carwash", resource_type: "image" })
    return res.secure_url || res.url || null
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
  let body: any = {}
  try { body = await req.json() } catch {}
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
