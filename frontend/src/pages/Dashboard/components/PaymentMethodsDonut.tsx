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

// Fatia da parte financiada das vendas fiado. Não tem flag de habilitado — não é um método de
// pagamento configurável, é o valor que ainda não passou por método nenhum. Sem ela, o total do
// donut ficaria menor que o faturamento sem explicação.
const CREDIT_KEY = 'Credit'

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

  const creditTotal = totalsByKey.get(CREDIT_KEY) ?? 0
  if (creditTotal > 0) {
    segments.push({
      label: PAYMENT_METHOD_LABELS[CREDIT_KEY],
      value: creditTotal,
      color: PAYMENT_METHOD_COLORS[CREDIT_KEY](theme),
    })
  }

  return (
    <DonutChart
      title="Formas de pagamento"
      info="Distribuição do faturamento entre as formas de pagamento habilitadas na loja. A fatia 'Crediário' é o valor vendido a prazo que ainda não foi recebido — quando o cliente pagar, entra pela forma usada na baixa. O centro mostra o total do período."
      segments={segments}
      loading={loading}
      showTotal
    />
  )
}
