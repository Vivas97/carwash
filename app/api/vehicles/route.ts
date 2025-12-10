import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { vin, internalCode, brand, model, color, year } = body || {}
  if (!vin || !internalCode || !brand || !model || !color || !year) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }
  // Ensure uniqueness
  const existingVin = await prisma.vehicle.findUnique({ where: { vin } })
  if (existingVin) {
    return NextResponse.json({ error: "VIN ya existe" }, { status: 409 })
  }
  const existingCode = await prisma.vehicle.findFirst({ where: { internalCode } })
  if (existingCode) {
    return NextResponse.json({ error: "Código interno ya existe" }, { status: 409 })
  }
  const created = await prisma.vehicle.create({
    data: { vin, internalCode, brand, model, color, year: Number(year) },
  })
  return NextResponse.json(created, { status: 201 })
}
export async function GET() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(vehicles)
}
