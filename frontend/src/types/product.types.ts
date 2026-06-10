export type StockLevel = 'OK' | 'Baixo' | 'Crítico'

export interface ProductCategory {
  id: string
  name: string
  color: string
}

export const STOCK_LEVELS: StockLevel[] = ['OK', 'Baixo', 'Crítico']

export interface CreateProductPayload {
  name: string
  barcode?: string
  price: number
  purchasePrice?: number
  stock: number
  minStock?: number
  minCriticalStock?: number
  categoryId?: string | null
}

export interface UpdateProductPayload {
  name: string
  barcode?: string
  price: number
  stock: number
  purchasePrice?: number
  minStock?: number
  minCriticalStock?: number
  categoryId?: string | null
}

export interface CreateCategoryPayload {
  name: string
  color: string
}

export interface UpdateCategoryPayload {
  name: string
  color: string
}

export interface Product {
  id: string
  name: string
  barcode?: string
  category: ProductCategory | null
  costPrice: number
  price: number
  stock: number
  isActive: boolean
  minStock?: number
  criticalStock?: number
  imageUrl?: string
}
