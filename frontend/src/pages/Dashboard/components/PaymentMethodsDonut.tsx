import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_LABELS } from '../../../constants/payment'
import type { SalesByPaymentMethod } from '../../../types/report.types'
import type { PaymentsSettings } from '../../../types/settings.types'

export interface PaymentMethodsDonutProps {
  data: SalesByPaymentMethod[]
  payments?: PaymentsSettings
  loading?: boolean
}

// Mapeia cada método (enum do backend) ao flag de habilitado no tenant.
const METHOD_ENABLED: Record<string, (p: PaymentsSettings) => boolean> = {
  PIX: (p) => p.pix.enabled,
  CreditCard: (p) => p.cardCredit.enabled,
  Cash: (p) => p.cash.enabled,
  DebitCard: (p) => p.cardDebit.enabled,
}

export default function PaymentMethodsDonut({ data, payments, loading = false }: PaymentMethodsDonutProps) {
  const theme = useTheme()

  const totalsByKey = new Map(data.map((d) => [d.paymentMethod, d.total]))

  // Só métodos habilitados no tenant; se payments ainda não carregou, mostra todos.
  const segments = Object.keys(METHOD_ENABLED)
    .filter((key) => (payments ? METHOD_ENABLED[key](payments) : true))
    .map((key) => ({
      label: PAYMENT_METHOD_LABELS[key] ?? key,
      value: totalsByKey.get(key) ?? 0,
      color: PAYMENT_METHOD_COLORS[key](theme),
    }))

  return (
    <DonutChart
      title="Formas de pagamento"
      info="Distribuição do valor recebido entre as formas de pagamento habilitadas na loja. O centro mostra o total do período."
      segments={segments}
      loading={loading}
      showTotal
    />
  )
}
