import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await req.json()
  const data: any = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.brandId === "string") data.brandId = body.brandId
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  const updated = await prisma.carModel.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  await prisma.carModel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

