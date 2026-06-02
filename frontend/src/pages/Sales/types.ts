export type { Product } from '../../types/product.types'

export interface CartLine {
  productId: string
  quantity: number
}

export type PaymentMethod = 'card' | 'pix' | 'cash'
export type CardType = 'credit' | 'debit'

export type CustomerSelection =
  | { type: 'none' }
  | { type: 'cpf'; document: string }
  | { type: 'entity'; id: string; name: string; document: string | null }
