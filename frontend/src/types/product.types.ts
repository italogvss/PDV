export type StockLevel = 'OK' | 'Baixo' | 'Crítico'

export interface ProductCategory{
  id: number,
  name: string,
  color: string,
}

export const STOCK_LEVELS: StockLevel[] = ['OK', 'Baixo', 'Crítico']

export const PRODUCT_CATEGORIES: string[] = ['Lanches', 'Sobremesas', 'Bebidas', 'Padaria']

export interface Product {
  id: string
  tenantId: string,
  name: string
  barcode?: string
  category: ProductCategory | null
  costPrice: number
  price: number
  stock: number
  minStock?: number
  criticalStock?: number
}
