export type StockLevel = 'OK' | 'Baixo' | 'Crítico'

export type ProductCategory = 'Bebidas' | 'Padaria' | 'Lanches' | 'Sobremesas' | 'Outros'

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Bebidas',
  'Padaria',
  'Lanches',
  'Sobremesas',
  'Outros',
]

export const STOCK_LEVELS: StockLevel[] = ['OK', 'Baixo', 'Crítico']

export interface Product {
  id: string
  name: string
  barcode?: string
  category: string
  costPrice: number
  price: number
  stock: number
  minStock?: number
  criticalStock?: number
}
