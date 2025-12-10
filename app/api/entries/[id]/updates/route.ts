import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
export const runtime = 'nodejs'

async function savePhotoToPublic(raw: string): Promise<string | null> {
  if (typeof raw !== "string" || raw.length === 0) return null
  if (raw.startsWith("/uploads/")) return raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (!raw.startsWith("data:")) return null
  try {
    const res = await cloudinary.uploader.upload(raw, { folder: "carwash", resource_type: "image" })
    return res.secure_url || res.url || null
  } catch {
    return null
  }
}

export async function POST(req: Request, context: any) {
  const { params } = await context
  const { id } = await params
  let body: any = {}
  try { body = await req.json() } catch {}
  const { text, photos = [] } = body || {}
  if (!text) return NextResponse.json({ error: "Texto requerido" }, { status: 400 })
  if (!id || typeof id !== 'string') return NextResponse.json({ error: "ID de entrada requerido" }, { status: 400 })
  const update = await prisma.entryUpdate.create({
    data: {
      text,
      entry: { connect: { id } },
    },
  })
  if (Array.isArray(photos) && photos.length > 0) {
    const saved = await Promise.all(photos.map((u: string) => savePhotoToPublic(u)))
    const valid = saved.filter((u): u is string => typeof u === "string" && u.length > 0)
    if (valid.length > 0) {
      await prisma.photo.createMany({ data: valid.map((url: string) => ({ entryId: id, updateId: update.id, type: "update", url })) })
    }
  }
  const withPhotos = await prisma.entryUpdate.findUnique({ where: { id: update.id }, include: { photos: true } })
  return NextResponse.json(withPhotos, { status: 201 })
}
