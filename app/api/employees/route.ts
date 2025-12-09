import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, completedServices: true, locationId: true },
  })
  return NextResponse.json(employees)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, username, password, phone, role = "technician", isActive = true, locationId } = body || {}
  if (!name || !email || !username || !password || !phone) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  try {
    const crypto = await import("node:crypto")
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
    const passwordHash = `${salt}:${hash}`
    const data: any = { name, email, username, passwordHash, phone, role, isActive }
    if (locationId && typeof locationId === 'string' && locationId.length > 0) {
      data.locationId = locationId
    }
    const created = await prisma.employee.create({ data })
    const safe = {
      id: created.id,
      name: created.name,
      email: created.email,
      // username omitted from response for security
      phone: created.phone,
      role: created.role,
      isActive: created.isActive,
      createdAt: created.createdAt,
      completedServices: created.completedServices,
      locationId: created.locationId,
    }
    return NextResponse.json(safe, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: "No se pudo crear" }, { status: 400 })
  }
}
