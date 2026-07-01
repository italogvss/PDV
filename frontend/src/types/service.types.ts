export interface ServiceProductItem {
  productId: string
  productName: string
  purchasePrice?: number
  price: number
  quantity: number
}

export interface CreateServicePayload {
  name: string
  description?: string
  durationMinutes?: number
  price: number
  categoryId?: string | null
  isActive?: boolean
  costPrice?: number | null
  products?: { productId: string; quantity: number }[]
}

export interface UpdateServicePayload {
  name: string
  description?: string
  durationMinutes?: number
  price: number
  categoryId?: string | null
  isActive: boolean
  costPrice?: number | null
  products?: { productId: string; quantity: number }[]
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
  costPrice?: number
  serviceProducts: ServiceProductItem[]
}
