import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) {
    return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  }
  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  const data: any = {}
  if (typeof body.status === "string") data.status = body.status
  if (body.arrivalDate) {
    const d = new Date(body.arrivalDate)
    if (!isNaN(d.getTime())) data.arrivalDate = d
  }
  if (body.completionDate) {
    const d = new Date(body.completionDate)
    if (!isNaN(d.getTime())) data.completionDate = d
  }
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes
  if (typeof body.finalNotes === "string" || body.finalNotes === null) data.finalNotes = body.finalNotes

  const prev = await prisma.vehicleEntry.findUnique({ where: { id }, select: { status: true, employeeId: true } })
  if (!prev) {
    return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 })
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.vehicleEntry.update({ where: { id }, data })
      if (Array.isArray(body.finalPhotos) && body.finalPhotos.length > 0) {
        const photos = body.finalPhotos.filter((u: any) => typeof u === "string" && u.length > 0)
        if (photos.length > 0) {
          const saved = await Promise.all(photos.map((u: string) => savePhotoToPublic(u)))
          const valid = saved.filter((u): u is string => typeof u === "string" && u.length > 0)
          if (valid.length > 0) {
            await tx.photo.createMany({ data: valid.map((url: string) => ({ entryId: id, type: "final", url })) })
          }
        }
      }
      if (body.status === "completed" && prev.status !== "completed") {
        await tx.employee.update({ where: { id: prev.employeeId }, data: { completedServices: { increment: 1 } } })
      }
      const withInclude = await tx.vehicleEntry.findUnique({
        where: { id },
        include: {
          vehicle: true,
          employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
          service: true,
          photos: true,
          updates: true,
        },
      })
      return withInclude
    })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: "No se pudo actualizar entrada" }, { status: 500 })
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const entry = await prisma.vehicleEntry.findUnique({
      where: { id },
      include: {
        vehicle: true,
        employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
        service: true,
        photos: true,
        updates: true,
      },
    })
    if (!entry) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(entry)
  } catch (err: any) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 })
  }
}
