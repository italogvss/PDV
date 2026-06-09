export interface CreateServicePayload {
  name: string
  description?: string
  durationMinutes?: number
  price: number
  categoryId?: string | null
  isActive?: boolean
}

export interface UpdateServicePayload {
  name: string
  description?: string
  durationMinutes?: number
  price: number
  categoryId?: string | null
  isActive: boolean
}

export interface CreateServiceCategoryPayload {
  name: string
  color: string
}

export interface UpdateServiceCategoryPayload {
  name: string
  color: string
}

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
