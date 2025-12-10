import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

export async function GET() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(locations)
}

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { name, address, city, country, isActive = true } = body || {}
  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  }
  const created = await prisma.location.create({ data: { name, address, city, country, isActive } })
  return NextResponse.json(created, { status: 201 })
}
