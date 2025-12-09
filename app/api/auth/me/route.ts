import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function GET() {
  const store = await cookies()
  const raw = store.get("session")?.value
  if (!raw) return NextResponse.json(null)
  let data: any
  try { data = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) } catch { return NextResponse.json(null) }
  const user = await prisma.employee.findUnique({ where: { id: data.id } })
  if (!user) return NextResponse.json(null)
  return NextResponse.json({ id: user.id, name: user.name, role: user.role, language: (user as any).language ?? 'es' })
}
