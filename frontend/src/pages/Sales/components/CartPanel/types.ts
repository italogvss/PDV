import { CartLine, PaymentMethod, Product } from '../../types'

export interface CartLineWithProduct extends CartLine {
  product: Product
}

export interface CartPanelProps {
  lines: CartLineWithProduct[]
  subtotal: number
  discount: number
  total: number
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  cashReceived: string
  onCashReceivedChange: (value: string) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onFinalize: () => void
}
