import type { Product } from '../../../../types/product.types'
import type { Service } from '../../../../types/service.types'
import type { CardType, PaymentMethod } from '../../types'
import type { PaymentsSettings } from '../../../../types/settings.types'

export type EnrichedCartLine =
  | { type: 'product'; productId: string; quantity: number; product: Product }
  | { type: 'service'; lineId: string; serviceId: string; quantity: number; service: Service }

export interface CartPanelProps {
  lines: EnrichedCartLine[]
  subtotal: number
  onRestart: () => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (id: string) => void
  onFinalize: () => void
  customerMissing: boolean
  discountAmount: number
  onDiscountChange: (value: number) => void
  allowDiscounts: boolean
  discountLimitPercent: number
  method: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
  cardType: CardType
  onCardTypeChange: (t: CardType) => void
  installments: number
  onInstallmentsChange: (n: number) => void
  cashReceived: string
  onCashReceivedChange: (v: string) => void
  payments: PaymentsSettings
}
