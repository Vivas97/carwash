import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const models = await prisma.carModel.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(models)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, brandId, isActive = true } = body || {}
  if (!name || typeof name !== "string" || !brandId) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const created = await prisma.carModel.create({ data: { name, brandId, isActive } })
  return NextResponse.json(created, { status: 201 })
}

