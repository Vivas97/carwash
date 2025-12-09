import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await req.json()
  const data: any = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.address === "string" || body.address === null) data.address = body.address
  if (typeof body.city === "string" || body.city === null) data.city = body.city
  if (typeof body.country === "string" || body.country === null) data.country = body.country
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  const updated = await prisma.location.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  await prisma.location.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

