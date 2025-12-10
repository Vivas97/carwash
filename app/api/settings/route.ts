import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
export const runtime = 'nodejs'

async function saveLogo(raw: any): Promise<string | null> {
  if (typeof raw !== "string" || raw.length === 0) return null
  if (raw.startsWith("/uploads/")) return raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (!raw.startsWith("data:")) return null
  try {
    const parts = raw.split(",")
    if (parts.length < 2) return null
    const meta = parts[0]
    const base64 = parts[1]
    const mime = meta.split(":")[1]?.split(";")[0] || "image/png"
    let ext = mime.split("/")[1] || "png"
    if (ext === "jpeg") ext = "jpg"
    const crypto = await import("node:crypto")
    const path = await import("node:path")
    const fs = await import("node:fs/promises")
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`
    const dir = path.join(process.cwd(), "public", "uploads")
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, name)
    await fs.writeFile(filePath, Buffer.from(base64, "base64"))
    return `/uploads/${name}`
  } catch {
    return null
  }
}

async function getOrCreateSettings() {
  let s = await prisma.settings.findFirst()
  if (!s) {
    s = await prisma.settings.create({ data: { companyName: "Carwash", phone: "", address: "" } })
  }
  return s
}

export async function GET() {
  const s = await getOrCreateSettings()
  return NextResponse.json(s)
}

export async function PATCH(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}
  const current = await getOrCreateSettings()
  const data: any = {}
  if (typeof body.companyName === "string") data.companyName = body.companyName
  if (typeof body.ein === "string" || body.ein === null) data.ein = body.ein
  if (typeof body.address === "string" || body.address === null) data.address = body.address
  if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone
  if (typeof body.email === "string" || body.email === null) data.email = body.email
  if (typeof body.hours === "string" || body.hours === null) data.hours = body.hours
  if (body.currency === 'USD' || body.currency === 'COP') data.currency = body.currency
  // language is now per-employee only; Settings no longer stores language
  if (typeof body.logo === "string") {
    const saved = await saveLogo(body.logo)
    if (saved) data.logo = saved
  } else if (body.logo === null) {
    data.logo = null
  }
  const updated = await prisma.settings.update({ where: { id: current.id }, data })
  return NextResponse.json(updated)
}
