import { PaymentMethod } from '../../../../types'

export interface PaymentSectionProps {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  total: number
  cashReceived: string
  onCashReceivedChange: (value: string) => void
}
