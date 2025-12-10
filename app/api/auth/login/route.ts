import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const { username, password } = body || {}
  if (!username || !password) return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 })
  let user = await prisma.employee.findUnique({ where: { username } })
  if (!user) user = await prisma.employee.findUnique({ where: { email: username } })
  if (!user || !user.isActive) return NextResponse.json({ error: "Usuario inválido" }, { status: 401 })
  if (!user.passwordHash) return NextResponse.json({ error: "Usuario sin contraseña" }, { status: 401 })
  const [salt, hash] = user.passwordHash.split(":")
  const crypto = await import("node:crypto")
  const calc = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
  if (calc !== hash) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
  const res = NextResponse.json({ id: user.id, name: user.name, role: user.role, language: (user as any).language ?? 'es' })
  res.cookies.set("session", Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString("base64"), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
  return res
}
