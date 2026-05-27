import type { CardType, PaymentMethod } from '../../../../types'

export interface PaymentSectionProps {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  cardType: CardType
  onCardTypeChange: (value: CardType) => void
  installments: number
  onInstallmentsChange: (value: number) => void
  total: number
  cashReceived: string
  onCashReceivedChange: (value: string) => void
}
