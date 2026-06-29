import type { CardType, PaymentMethod, CustomerSelection } from '../../types'
import type { EnrichedCartLine } from '../CartPanel/types'

export interface FinalizationModalProps {
  open: boolean
  onClose: () => void
  lines: EnrichedCartLine[]
  subtotal: number
  discountAmount: number
  customer: CustomerSelection
  method: PaymentMethod
  cardType: CardType
  installments: number
  onFinalize: () => void
  isSubmitting: boolean
}
