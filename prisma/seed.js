const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function ensureEmployee(email, data) {
  const existing = await prisma.employee.findUnique({ where: { email } })
  if (existing) return existing
  return prisma.employee.create({ data })
}

async function ensureVehicle(vin, data) {
  const existing = await prisma.vehicle.findUnique({ where: { vin } })
  if (existing) return existing
  return prisma.vehicle.create({ data })
}

async function ensureService(name, data) {
  const existing = await prisma.service.findFirst({ where: { name } })
  if (existing) return existing
  return prisma.service.create({ data })
}

async function ensureBrand(name) {
  const existing = await prisma.brand.findUnique({ where: { name } })
  if (existing) return existing
  return prisma.brand.create({ data: { name } })
}

async function ensureModel(brandId, name) {
  const existing = await prisma.carModel.findFirst({ where: { brandId, name } })
  if (existing) return existing
  return prisma.carModel.create({ data: { brandId, name } })
}

async function main() {
  const employees = await Promise.all([
    ensureEmployee('admin@carwash.local', { name: 'Administrador', email: 'admin@carwash.local', phone: '000000000', role: 'admin' }),
    ensureEmployee('juan.perez@carwash.local', { name: 'Juan Pérez', email: 'juan.perez@carwash.local', phone: '555111222', role: 'technician' }),
    ensureEmployee('maria.lopez@carwash.local', { name: 'María López', email: 'maria.lopez@carwash.local', phone: '555333444', role: 'technician' }),
  ])

  // Ensure admin has username/password
  try {
    const crypto = require('crypto')
    const admin = employees[0]
    if (!admin.username || !admin.passwordHash) {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 64, 'sha512').toString('hex')
      const passwordHash = `${salt}:${hash}`
      await prisma.employee.update({ where: { id: admin.id }, data: { username: 'admin', passwordHash } })
    }
  } catch {}

  const vehicles = await Promise.all([
    ensureVehicle('1HGCM82633A004352', { vin: '1HGCM82633A004352', internalCode: 'CW-001', brand: 'Toyota', model: 'Corolla', color: 'Blanco', year: 2019 }),
    ensureVehicle('JHMFA16586S000123', { vin: 'JHMFA16586S000123', internalCode: 'CW-002', brand: 'Honda', model: 'Civic', color: 'Negro', year: 2020 }),
  ])

  const services = await Promise.all([
    ensureService('Lavado Básico', { name: 'Lavado Básico', description: 'Lavado exterior rápido', price: 150, duration: 20 }),
    ensureService('Lavado Premium', { name: 'Lavado Premium', description: 'Exterior e interior con detallado', price: 350, duration: 60 }),
    ensureService('Desinfección', { name: 'Desinfección', description: 'Desinfección interior', price: 250, duration: 40 }),
  ])

  const toyota = await ensureBrand('Toyota')
  const honda = await ensureBrand('Honda')
  await Promise.all([
    ensureModel(toyota.id, 'Corolla'),
    ensureModel(toyota.id, 'Hilux'),
    ensureModel(honda.id, 'Civic'),
    ensureModel(honda.id, 'CR-V'),
  ])

  const entry = await prisma.vehicleEntry.create({
    data: {
      vehicleId: vehicles[0].id,
      employeeId: employees[1].id,
      serviceId: services[0].id,
      status: 'pending',
      arrivalDate: new Date(),
      notes: 'Cliente espera en recepción',
    },
  })

  await prisma.photo.createMany({
    data: [
      { entryId: entry.id, type: 'initial', url: 'https://example.com/photo1.jpg' },
      { entryId: entry.id, type: 'final', url: 'https://example.com/photo2.jpg' },
    ],
  })

  await prisma.settings.create({
    data: {
      companyName: 'Mi Carwash',
      phone: '555123456',
      email: 'contacto@carwash.local',
      address: 'Av. Principal 123',
      hours: 'Lun-Sáb 8:00-18:00',
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
