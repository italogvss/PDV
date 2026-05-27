export type StockLevel = 'OK' | 'Baixo' | 'Crítico'

export interface ProductCategory {
  id: string
  name: string
  color: string
}

export const STOCK_LEVELS: StockLevel[] = ['OK', 'Baixo', 'Crítico']

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
}
