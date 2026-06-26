import type { CardType, PaymentMethod, CustomerSelection } from '../../types'
import type { EnrichedCartLine } from '../CartPanel/types'
import type { PaymentsSettings } from '../../../../types/settings.types'

export interface FinalizationModalProps {
  open: boolean
  onClose: () => void
  lines: EnrichedCartLine[]
  subtotal: number
  discountAmount: number
  onDiscountChange: (value: number) => void
  allowDiscounts: boolean
  discountLimitPercent: number
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
  payments: PaymentsSettings
  onFinalize: () => void
  isSubmitting: boolean
  requireCustomerOnSale: boolean
}
