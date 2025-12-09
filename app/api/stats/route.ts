import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function GET() {
  let whereBase: any = {}
  try {
    const store = await cookies()
    const raw = store.get("session")?.value
    if (raw) {
      const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
      if (data?.role === "technician" && data?.id) {
        whereBase.employeeId = String(data.id)
      }
    }
  } catch {}
  const [totalVehicles, totalEmployees, totalServices] = await Promise.all([
    prisma.vehicle.count(),
    prisma.employee.count(),
    prisma.service.count(),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const entriesToday = await prisma.vehicleEntry.findMany({
    where: { arrivalDate: { gte: today, lt: tomorrow }, ...whereBase },
    include: { service: true },
  })

  const todayEntries = entriesToday.length
  const inProgressToday = await prisma.vehicleEntry.count({ where: { status: "in-progress", ...whereBase } })
  const pendingToday = entriesToday.filter((e) => e.status === "pending").length
  const completedToday = entriesToday.filter((e) => e.status === "completed").length
  const totalRevenue = entriesToday
    .filter((e) => e.status === "completed")
    .reduce((sum, e) => sum + (e.service?.price || 0), 0)

  return NextResponse.json({
    totalVehicles,
    totalEmployees,
    totalServices,
    todayEntries,
    inProgressToday,
    pendingToday,
    completedToday,
    totalRevenue,
  })
}
