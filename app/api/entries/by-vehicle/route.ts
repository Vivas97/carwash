import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") || undefined
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
  const entries = await prisma.vehicleEntry.findMany({
    where: { vehicleId: id },
    orderBy: { arrivalDate: "desc" },
    include: {
      vehicle: true,
      employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
      service: true,
      photos: true,
      updates: { include: { photos: true } },
    },
  })
  return NextResponse.json(entries)
}
