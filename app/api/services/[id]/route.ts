import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const idParam = params?.id || url.pathname.split('/').pop() || undefined
  let body: any = {}
  try {
    body = await req.json()
  } catch {}
  const data: any = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.description === "string" || body.description === null) data.description = body.description
  if (typeof body.price === "number") data.price = body.price
  if (typeof body.duration === "number") data.duration = body.duration
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  try {
    if (!idParam) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
    const updated = await prisma.service.update({ where: { id: idParam }, data })
    return NextResponse.json(updated)
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
      }
    }
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params?: { id?: string } }) {
  const url = new URL(_req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
