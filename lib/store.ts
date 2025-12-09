import type { Vehicle, VehicleEntry, Employee, Service, Settings, Location, Brand, CarModel } from "./types"

const STORAGE_KEY = "carwash:store:v1"

const initialVehicles: Vehicle[] = []

const initialEmployees: Employee[] = []

const initialServices: Service[] = []

const initialEntries: VehicleEntry[] = []

const initialLocations: Location[] = []

const initialBrands: Brand[] = []
const initialModels: CarModel[] = []

const initialSettings: Settings = {
  companyName: "",
  ein: "",
  address: "",
  phone: "",
  logo: undefined,
  currency: "USD",
  language: "en",
}

// Store class
class Store {
  private loaded = false
  private vehicles: Vehicle[] = initialVehicles
  private employees: Employee[] = initialEmployees
  private services: Service[] = initialServices
  private entries: VehicleEntry[] = initialEntries
  private locations: Location[] = initialLocations
  private brands: Brand[] = initialBrands
  private models: CarModel[] = initialModels
  private settings: Settings = initialSettings

  private ensureLoaded() {
    if (this.loaded) return
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const revived = this.revive(parsed)
        this.vehicles = revived.vehicles
        this.employees = revived.employees
        this.services = revived.services
        this.entries = revived.entries
        this.locations = revived.locations
        this.brands = revived.brands
        this.models = revived.models
        this.settings = revived.settings
      } catch {}
    }
    this.loaded = true
  }

  private persist() {
    if (typeof window === "undefined") return
    const data = this.serialize()
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }

  private serialize() {
    return {
      vehicles: this.vehicles.map((v) => ({
        ...v,
        createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : undefined,
        entries: [],
      })),
      employees: this.employees.map((e) => ({
        ...e,
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : undefined,
      })),
      services: this.services,
      entries: this.entries.map((en) => ({
        id: en.id,
        vehicleId: en.vehicleId,
        employeeId: en.employeeId,
        serviceId: en.serviceId,
        status: en.status,
        arrivalDate: en.arrivalDate ? new Date(en.arrivalDate).toISOString() : undefined,
        completionDate: en.completionDate ? new Date(en.completionDate).toISOString() : undefined,
        initialPhotos: en.initialPhotos || [],
        finalPhotos: en.finalPhotos || [],
        notes: en.notes,
        finalNotes: en.finalNotes,
        updates: (en.updates || []).map((u) => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
        })),
        location: en.location,
      })),
      locations: this.locations.map((l) => ({
        ...l,
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
      })),
      brands: this.brands.map((b) => ({
        ...b,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
      })),
      models: this.models.map((m) => ({
        ...m,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
      })),
      settings: this.settings,
    }
  }

  private revive(data: any) {
    const vehicles: Vehicle[] = (data.vehicles || []).map((v: any) => ({
      ...v,
      createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
      entries: [],
    }))
    const employees: Employee[] = (data.employees || []).map((e: any) => ({
      ...e,
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
    }))
    const services: Service[] = Array.isArray(data.services) ? data.services : []
    const entries: VehicleEntry[] = (data.entries || []).map((en: any) => ({
      ...en,
      arrivalDate: en.arrivalDate ? new Date(en.arrivalDate) : new Date(),
      completionDate: en.completionDate ? new Date(en.completionDate) : undefined,
      updates: (en.updates || []).map((u: any) => ({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      })),
      vehicle: undefined,
      employee: undefined,
      service: undefined,
    }))
    const locations: Location[] = (data.locations || []).map((l: any) => ({
      ...l,
      createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
    }))
    const brands: Brand[] = (data.brands || []).map((b: any) => ({
      ...b,
      createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
    }))
    const models: CarModel[] = (data.models || []).map((m: any) => ({
      ...m,
      createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
    }))
    const settings: Settings = data.settings || initialSettings
    return { vehicles, employees, services, entries, locations, brands, models, settings }
  }

  // Vehicles
  getVehicles() {
    this.ensureLoaded()
    return this.vehicles
  }

  getVehicle(id: string) {
    this.ensureLoaded()
    return this.vehicles.find((v) => v.id === id)
  }

  getVehicleByVin(vin: string) {
    this.ensureLoaded()
    return this.vehicles.find((v) => v.vin === vin)
  }

  getVehicleByInternalCode(code: string) {
    this.ensureLoaded()
    return this.vehicles.find((v) => v.internalCode === code)
  }

  addVehicle(vehicle: Omit<Vehicle, "id" | "createdAt" | "entries">) {
    this.ensureLoaded()
    const newVehicle: Vehicle = {
      ...vehicle,
      id: Date.now().toString(),
      createdAt: new Date(),
      entries: [],
    }
    this.vehicles.push(newVehicle)
    this.persist()
    return newVehicle
  }

  updateVehicle(id: string, data: Partial<Vehicle>) {
    this.ensureLoaded()
    const index = this.vehicles.findIndex((v) => v.id === id)
    if (index !== -1) {
      this.vehicles[index] = { ...this.vehicles[index], ...data }
      this.persist()
      return this.vehicles[index]
    }
    return null
  }

  deleteVehicle(id: string) {
    this.ensureLoaded()
    this.vehicles = this.vehicles.filter((v) => v.id !== id)
    this.persist()
  }

  // Employees
  getEmployees() {
    this.ensureLoaded()
    return this.employees
  }

  getEmployee(id: string) {
    this.ensureLoaded()
    return this.employees.find((e) => e.id === id)
  }

  addEmployee(employee: Omit<Employee, "id" | "createdAt" | "completedServices">) {
    this.ensureLoaded()
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
      createdAt: new Date(),
      completedServices: 0,
    }
    this.employees.push(newEmployee)
    this.persist()
    return newEmployee
  }

  updateEmployee(id: string, data: Partial<Employee>) {
    this.ensureLoaded()
    const index = this.employees.findIndex((e) => e.id === id)
    if (index !== -1) {
      this.employees[index] = { ...this.employees[index], ...data }
      this.persist()
      return this.employees[index]
    }
    return null
  }

  deleteEmployee(id: string) {
    this.ensureLoaded()
    this.employees = this.employees.filter((e) => e.id !== id)
    this.persist()
  }

  // Locations
  getLocations() {
    this.ensureLoaded()
    return this.locations
  }

  getLocation(id: string) {
    this.ensureLoaded()
    return this.locations.find((l) => l.id === id)
  }

  addLocation(location: Omit<Location, "id" | "createdAt">) {
    this.ensureLoaded()
    const newLocation: Location = {
      ...location,
      id: Date.now().toString(),
      createdAt: new Date(),
    }
    this.locations.push(newLocation)
    this.persist()
    return newLocation
  }

  updateLocation(id: string, data: Partial<Location>) {
    this.ensureLoaded()
    const index = this.locations.findIndex((l) => l.id === id)
    if (index !== -1) {
      this.locations[index] = { ...this.locations[index], ...data }
      this.persist()
      return this.locations[index]
    }
    return null
  }

  deleteLocation(id: string) {
    this.ensureLoaded()
    this.locations = this.locations.filter((l) => l.id !== id)
    this.persist()
  }

  // Brands
  getBrands() {
    this.ensureLoaded()
    return this.brands
  }

  getBrand(id: string) {
    this.ensureLoaded()
    return this.brands.find((b) => b.id === id)
  }

  addBrand(brand: Omit<Brand, "id" | "createdAt">) {
    this.ensureLoaded()
    const newBrand: Brand = { ...brand, id: Date.now().toString(), createdAt: new Date() }
    this.brands.push(newBrand)
    this.persist()
    return newBrand
  }

  updateBrand(id: string, data: Partial<Brand>) {
    this.ensureLoaded()
    const index = this.brands.findIndex((b) => b.id === id)
    if (index !== -1) {
      this.brands[index] = { ...this.brands[index], ...data }
      this.persist()
      return this.brands[index]
    }
    return null
  }

  deleteBrand(id: string) {
    this.ensureLoaded()
    this.brands = this.brands.filter((b) => b.id !== id)
    this.models = this.models.filter((m) => m.brandId !== id)
    this.persist()
  }

  // Models
  getModels() {
    this.ensureLoaded()
    return this.models
  }

  getModelsByBrand(brandId: string) {
    this.ensureLoaded()
    return this.models.filter((m) => m.brandId === brandId)
  }

  getModel(id: string) {
    this.ensureLoaded()
    return this.models.find((m) => m.id === id)
  }

  addModel(model: Omit<CarModel, "id" | "createdAt">) {
    this.ensureLoaded()
    const newModel: CarModel = { ...model, id: Date.now().toString(), createdAt: new Date() }
    this.models.push(newModel)
    this.persist()
    return newModel
  }

  updateModel(id: string, data: Partial<CarModel>) {
    this.ensureLoaded()
    const index = this.models.findIndex((m) => m.id === id)
    if (index !== -1) {
      this.models[index] = { ...this.models[index], ...data }
      this.persist()
      return this.models[index]
    }
    return null
  }

  deleteModel(id: string) {
    this.ensureLoaded()
    this.models = this.models.filter((m) => m.id !== id)
    this.persist()
  }

  // Services
  getServices() {
    this.ensureLoaded()
    return this.services
  }

  getService(id: string) {
    this.ensureLoaded()
    return this.services.find((s) => s.id === id)
  }

  addService(service: Omit<Service, "id">) {
    this.ensureLoaded()
    const newService: Service = {
      ...service,
      id: Date.now().toString(),
    }
    this.services.push(newService)
    this.persist()
    return newService
  }

  updateService(id: string, data: Partial<Service>) {
    this.ensureLoaded()
    const index = this.services.findIndex((s) => s.id === id)
    if (index !== -1) {
      this.services[index] = { ...this.services[index], ...data }
      this.persist()
      return this.services[index]
    }
    return null
  }

  deleteService(id: string) {
    this.ensureLoaded()
    this.services = this.services.filter((s) => s.id !== id)
    this.persist()
  }

  // Entries
  getEntries() {
    this.ensureLoaded()
    return this.entries.map((entry) => ({
      ...entry,
      vehicle: this.getVehicle(entry.vehicleId),
      employee: this.getEmployee(entry.employeeId),
      service: this.getService(entry.serviceId),
    }))
  }

  getEntriesByVehicle(vehicleId: string) {
    this.ensureLoaded()
    return this.entries
      .filter((e) => e.vehicleId === vehicleId)
      .map((entry) => ({
        ...entry,
        vehicle: this.getVehicle(entry.vehicleId),
        employee: this.getEmployee(entry.employeeId),
        service: this.getService(entry.serviceId),
      }))
  }

  getEntriesByEmployee(employeeId: string) {
    this.ensureLoaded()
    return this.entries
      .filter((e) => e.employeeId === employeeId)
      .map((entry) => ({
        ...entry,
        vehicle: this.getVehicle(entry.vehicleId),
        employee: this.getEmployee(entry.employeeId),
        service: this.getService(entry.serviceId),
      }))
  }

  addEntry(entry: Omit<VehicleEntry, "id">) {
    this.ensureLoaded()
    const newEntry: VehicleEntry = {
      ...entry,
      id: Date.now().toString(),
      updates: entry.updates ?? [],
    }
    this.entries.push(newEntry)
    this.persist()
    return newEntry
  }

  updateEntry(id: string, data: Partial<VehicleEntry>) {
    this.ensureLoaded()
    const index = this.entries.findIndex((e) => e.id === id)
    if (index !== -1) {
      this.entries[index] = { ...this.entries[index], ...data }

      // Update employee completed services count if status changed to completed
      if (data.status === "completed") {
        const employeeIndex = this.employees.findIndex((e) => e.id === this.entries[index].employeeId)
        if (employeeIndex !== -1) {
          this.employees[employeeIndex].completedServices++
        }
      }

      this.persist()
      return this.entries[index]
    }
    return null
  }

  addEntryUpdate(entryId: string, update: { text: string; photos?: string[] }) {
    this.ensureLoaded()
    const index = this.entries.findIndex((e) => e.id === entryId)
    if (index === -1) return null
    const newUpdate = {
      id: Date.now().toString(),
      text: update.text,
      photos: update.photos || [],
      createdAt: new Date(),
    }
    const existingUpdates = this.entries[index].updates || []
    this.entries[index].updates = [...existingUpdates, newUpdate]
    this.persist()
    return newUpdate
  }

  // Stats
  getStats() {
    this.ensureLoaded()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEntries = this.entries.filter((e) => {
      const entryDate = new Date(e.arrivalDate)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate.getTime() === today.getTime()
    })

    const completedToday = todayEntries.filter((e) => e.status === "completed").length
    const inProgressToday = todayEntries.filter((e) => e.status === "in-progress").length
    const pendingToday = todayEntries.filter((e) => e.status === "pending").length

    const totalRevenue = this.entries
      .filter((e) => e.status === "completed")
      .reduce((acc, entry) => {
        const service = this.getService(entry.serviceId)
        return acc + (service?.price || 0)
      }, 0)

    return {
      totalVehicles: this.vehicles.length,
      totalEmployees: this.employees.filter((e) => e.isActive).length,
      totalServices: this.services.filter((s) => s.isActive).length,
      todayEntries: todayEntries.length,
      completedToday,
      inProgressToday,
      pendingToday,
      totalRevenue,
    }
  }

  // Settings
  getSettings() {
    this.ensureLoaded()
    return this.settings
  }

  updateSettings(data: Partial<Settings>) {
    this.ensureLoaded()
    this.settings = { ...this.settings, ...data }
    this.persist()
    return this.settings
  }
}

export const store = new Store()
