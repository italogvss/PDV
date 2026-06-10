import type { CardType, PaymentMethod, CustomerSelection } from '../../types'
import type { EnrichedCartLine } from '../CartPanel/types'

export interface FinalizationModalProps {
  open: boolean
  onClose: () => void
  lines: EnrichedCartLine[]
  subtotal: number
  discountAmount: number
  onDiscountChange: (value: number) => void
  customer: CustomerSelection
  onCustomerChange: (c: CustomerSelection) => void
  onOpenCustomerModal: () => void
  method: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
  cardType: CardType
  onCardTypeChange: (t: CardType) => void
  installments: number
  onInstallmentsChange: (n: number) => void
  cashReceived: string
  onCashReceivedChange: (v: string) => void
  onFinalize: () => void
  isSubmitting: boolean
}
