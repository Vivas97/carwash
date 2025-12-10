import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params?: { id?: string } }
) {
  const url = new URL(req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  const body = await req.json()
  const data: any = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  const updated = await prisma.brand.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params?: { id?: string } }
) {
  const url = new URL(_req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  await prisma.brand.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
