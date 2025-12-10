import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

export async function GET() {
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(brands)
}

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { name, isActive = true } = body || {}
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  }
  const created = await prisma.brand.create({ data: { name, isActive } })
  return NextResponse.json(created, { status: 201 })
}
