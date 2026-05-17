export type ProductCategory = 'bebidas' | 'padaria' | 'lanches' | 'sobremesa' | 'outros'

export interface Product {
  id: string
  name: string
  price: number
  category: ProductCategory
  imageColor: string
}

export interface CartLine {
  productId: string
  quantity: number
}

export type PaymentMethod = 'card' | 'pix' | 'cash'
