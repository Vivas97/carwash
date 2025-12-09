export interface Vehicle {
  id: string
  vin: string
  internalCode: string
  brand: string
  model: string
  color: string
  year: number
  createdAt: Date
  entries: VehicleEntry[]
}

export interface VehicleEntry {
  id: string
  vehicleId: string
  employeeId: string
  serviceId: string
  status: "pending" | "in-progress" | "completed"
  arrivalDate: Date
  completionDate?: Date
  initialPhotos: string[]
  finalPhotos: string[]
  notes: string
  finalNotes?: string
  updates?: EntryUpdate[]
  location?: { lat: number; lng: number; accuracy?: number }
  vehicle?: Vehicle
  employee?: Employee
  service?: Service
}

export interface EntryUpdate {
  id: string
  text: string
  photos?: string[]
  createdAt: Date
}

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  role: "admin" | "supervisor" | "technician"
  isActive: boolean
  createdAt: Date
  completedServices: number
  locationId: string
}

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  isActive: boolean
}

export interface Settings {
  companyName: string
  ein: string
  address: string
  phone: string
  logo?: string
  currency: string
  language: string
}

export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  country?: string
  isActive: boolean
  createdAt: Date
}

export interface Brand {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
}

export interface CarModel {
  id: string
  brandId: string
  name: string
  isActive: boolean
  createdAt: Date
}
