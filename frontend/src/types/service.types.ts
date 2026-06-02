export interface ServiceCategory {
  id: string
  name: string
  color: string
}

export interface Service {
  id: string
  name: string
  description?: string
  durationMinutes?: number
  price: number
  category: ServiceCategory | null
  isActive: boolean
}
