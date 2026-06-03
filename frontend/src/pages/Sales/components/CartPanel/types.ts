import type { CardType, PaymentMethod, CustomerSelection } from '../../types'
import type { Product } from '../../../../types/product.types'
import type { Service } from '../../../../types/service.types'

export type EnrichedCartLine =
  | { type: 'product'; productId: string; quantity: number; product: Product }
  | { type: 'service'; lineId: string; serviceId: string; quantity: number; service: Service }

export interface CartPanelProps {
  lines: EnrichedCartLine[]
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
  onRemove: (id: string) => void
  onFinalize: () => void
  isSubmitting?: boolean
  customer: CustomerSelection
  onCustomerChange: (c: CustomerSelection) => void
  onOpenCustomerModal: () => void
}
