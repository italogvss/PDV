export type { Product } from '../../types/product.types'

export interface ProductCartLine {
  type: 'product'
  productId: string
  quantity: number
}

export interface ServiceCartLine {
  type: 'service'
  lineId: string
  serviceId: string
  quantity: number
}

export type CartLine = ProductCartLine | ServiceCartLine

export type PaymentMethod = 'card' | 'pix' | 'cash'
export type CardType = 'credit' | 'debit'

export type CustomerSelection =
  | { type: 'none' }
  | { type: 'cpf'; document: string }
  | { type: 'entity'; id: string; name: string; document: string | null }
