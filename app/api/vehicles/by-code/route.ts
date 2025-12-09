import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const vinRaw = searchParams.get("vin") || undefined
  const codeRaw = searchParams.get("code") || undefined
  const vin = vinRaw ? vinRaw.trim() : undefined
  const code = codeRaw ? codeRaw.trim() : undefined
  if (!vin && !code) {
    return NextResponse.json({ error: "Debe enviar vin o code" }, { status: 400 })
  }
  let vehicle = null as any
  const values = [vin, code].filter(Boolean) as string[]
  vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        ...values.map((v) => ({ vin: v })),
        ...values.map((v) => ({ internalCode: v })),
      ],
    },
  })
  if (!vehicle) return NextResponse.json({ found: false }, { status: 404 })
  return NextResponse.json({ found: true, vehicle })
}
