import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"

async function deleteFileIfExists(url: string) {
  try {
    if (typeof url !== 'string' || url.length === 0) return
    // Delete local file
    if (url.startsWith('/uploads/')) {
      const pathMod = await import('node:path')
      const fs = await import('node:fs/promises')
      const rel = url.replace(/^\//, '')
      const primary = pathMod.join(process.cwd(), rel)
      const fallback = pathMod.join(process.cwd(), '.next', 'standalone', rel)
      let filePath = primary
      try { await fs.access(primary) } catch { filePath = fallback }
      await fs.unlink(filePath).catch(() => {})
      return
    }
    // Delete Cloudinary asset by deriving public_id from URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url)
        const pathname = parsed.pathname
        const idx = pathname.indexOf('/upload/')
        if (idx >= 0) {
          let sub = pathname.slice(idx + '/upload/'.length)
          const segs = sub.split('/').filter(Boolean)
          if (segs.length > 0 && /^v\d+$/.test(segs[0])) segs.shift()
          if (segs.length > 0) {
            let last = segs.pop() as string
            const qIndex = last.indexOf('?')
            if (qIndex >= 0) last = last.slice(0, qIndex)
            const dot = last.lastIndexOf('.')
            if (dot >= 0) last = last.slice(0, dot)
            segs.push(last)
            const publicId = segs.join('/')
            if (publicId && publicId.length > 0) {
              await cloudinary.uploader.destroy(publicId).catch(() => {})
            }
          }
        }
      } catch {}
      return
    }
  } catch {}
}

export async function GET(_req: Request, { params }: { params?: { id?: string } }) {
  const url = new URL(_req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })
  if (!vehicle) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(vehicle)
}

export async function DELETE(_req: Request, { params }: { params?: { id?: string } }) {
  const url = new URL(_req.url)
  const id = params?.id || url.pathname.split('/').pop() || undefined
  if (!id) return NextResponse.json({ error: "Identificador requerido" }, { status: 400 })
  const entries = await prisma.vehicleEntry.findMany({
    where: { vehicleId: id },
    include: { photos: true, updates: { include: { photos: true } } },
  })
  const entryIds = entries.map((e) => e.id)
  const photoUrls: string[] = []
  for (const e of entries) {
    for (const p of (e.photos || [])) photoUrls.push(p.url)
    for (const u of (e.updates || [])) {
      for (const p of (u.photos || [])) photoUrls.push(p.url)
    }
  }
  await prisma.$transaction(async (tx) => {
    if (entryIds.length > 0) {
      await tx.photo.deleteMany({ where: { entryId: { in: entryIds } } })
      await tx.entryUpdate.deleteMany({ where: { entryId: { in: entryIds } } })
      await tx.vehicleEntry.deleteMany({ where: { id: { in: entryIds } } })
    }
    await tx.vehicle.delete({ where: { id } })
  })
  await Promise.all(photoUrls.map((u) => deleteFileIfExists(u)))
  return NextResponse.json({ ok: true })
}
