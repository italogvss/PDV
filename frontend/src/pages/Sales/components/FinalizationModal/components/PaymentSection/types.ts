import type { CardType, PaymentMethod } from '../../../../types'
import type { PaymentsSettings } from '../../../../../../types/settings.types'

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
  payments: PaymentsSettings
  /**
   * `sale` = método de toda a venda (parcelamento de cartão e troco fazem sentido).
   * `downPayment` = método só da ENTRADA de um crediário: o valor é exato e o resto vem nas
   * baixas das parcelas, então não há parcelamento de cartão nem troco a calcular.
   */
  variant?: 'sale' | 'downPayment'
}
