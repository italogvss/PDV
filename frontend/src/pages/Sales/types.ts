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

// À vista × fiado. Não entra em PaymentMethod de propósito: "Credit" não existe no enum do
// backend — fiado é a AUSÊNCIA de pagamento, não uma forma (ver constants/payment.ts).
// Num crediário o PaymentMethod da venda descreve a entrada.
export type SaleKind = 'cash' | 'credit'

export type CustomerSelection =
  | { type: 'none' }
  | { type: 'cpf'; document: string }
  | { type: 'entity'; id: string; name: string; document: string | null }
