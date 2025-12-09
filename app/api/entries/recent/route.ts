import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const entries = await prisma.vehicleEntry.findMany({
    orderBy: { arrivalDate: "desc" },
    take: 5,
    include: {
      vehicle: true,
      employee: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, locationId: true } },
      service: true,
      photos: true,
    },
  })
  return NextResponse.json(entries)
}
