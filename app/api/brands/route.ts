import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(brands)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, isActive = true } = body || {}
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  }
  const created = await prisma.brand.create({ data: { name, isActive } })
  return NextResponse.json(created, { status: 201 })
}

