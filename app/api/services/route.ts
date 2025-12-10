import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(services)
}

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { name, description, price, duration, isActive = true } = body || {}
  if (!name || typeof price !== "number" || typeof duration !== "number") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const created = await prisma.service.create({ data: { name, description, price, duration, isActive } })
  return NextResponse.json(created, { status: 201 })
}
