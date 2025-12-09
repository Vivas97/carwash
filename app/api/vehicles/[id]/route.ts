import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function deleteFileIfExists(url: string) {
  try {
    if (typeof url !== 'string' || url.length === 0) return
    if (!url.startsWith('/uploads/')) return
    const pathMod = await import('node:path')
    const fs = await import('node:fs/promises')
    const rel = url.replace(/^\//, '')
    const primary = pathMod.join(process.cwd(), rel)
    const fallback = pathMod.join(process.cwd(), '.next', 'standalone', rel)
    let filePath = primary
    try { await fs.access(primary) } catch { filePath = fallback }
    await fs.unlink(filePath).catch(() => {})
  } catch {}
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })
  if (!vehicle) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(vehicle)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
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
