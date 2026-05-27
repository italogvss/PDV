import type { CartLine, CardType, PaymentMethod } from '../../types'
import type { Product } from '../../../../types/product.types'

export interface CartLineWithProduct extends CartLine {
  product: Product
}

export interface CartPanelProps {
  lines: CartLineWithProduct[]
  subtotal: number
  total: number
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  cardType: CardType
  onCardTypeChange: (value: CardType) => void
  installments: number
  onInstallmentsChange: (value: number) => void
  cashReceived: string
  onCashReceivedChange: (value: string) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onFinalize: () => void
  isSubmitting?: boolean
}
