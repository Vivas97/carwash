import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const idParam = params?.id || url.pathname.split('/').pop() || undefined
  const body = await req.json()
  const data: any = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.email === "string") data.email = body.email
  if (typeof body.username === "string") data.username = body.username
  if (typeof body.phone === "string") data.phone = body.phone
  if (typeof body.role === "string") data.role = body.role
  if (body.language === 'en' || body.language === 'es') data.language = body.language
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (typeof body.locationId === "string") {
    data.locationId = body.locationId.length > 0 ? body.locationId : null
  } else if (body.locationId === null) {
    data.locationId = null
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    const crypto = await import("node:crypto")
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.pbkdf2Sync(body.password, salt, 100000, 64, "sha512").toString("hex")
    data.passwordHash = `${salt}:${hash}`
  }
  try {
    const where: any = {}
    if (idParam) where.id = idParam
    else if (typeof body.email === "string") where.email = body.email
    else return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
    const updated = await prisma.employee.update({ where, data })
    const safe = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: (updated as any).username,
      phone: updated.phone,
      role: updated.role,
      language: (updated as any).language,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      completedServices: updated.completedServices,
      locationId: updated.locationId,
    }
    return NextResponse.json(safe)
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Email ya existe" }, { status: 409 })
      }
      if (err.code === "P2003") {
        return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 })
      }
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
      }
    }
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params?: { id?: string } }) {
  const url = new URL(_req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  await prisma.employee.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
