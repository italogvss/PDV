import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_LABELS } from '../../../constants/payment'
import type { ReportBasis, SalesByPaymentMethod } from '../../../types/report.types'

export interface PaymentMethodPieChartProps {
  data: SalesByPaymentMethod[]
  basis: ReportBasis
  loading?: boolean
}

export default function PaymentMethodPieChart({
  data,
  basis,
  loading = false,
}: PaymentMethodPieChartProps) {
  const theme = useTheme()

  const segments = data.map((d) => ({
    label: PAYMENT_METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod,
    value: d.total,
    color: PAYMENT_METHOD_COLORS[d.paymentMethod]?.(theme) ?? theme.palette.neutral[500],
  }))

  return (
    <DonutChart
      title="Vendas por forma de pagamento"
      subtitle={basis === 'cash' ? 'Por onde o dinheiro entrou' : 'Como as vendas foram fechadas'}
      info={
        basis === 'cash'
          ? 'Fonte: total das vendas à vista + entrada do crediário (pela forma da venda) + cada baixa de parcela (pela forma usada no recebimento). Só aparece dinheiro que entrou de fato — não existe fatia "Crediário" aqui, porque fiado em aberto não entrou por forma nenhuma. O total fecha com o KPI "Recebido".'
          : 'Fonte: total das vendas ativas do período por Sale.PaymentMethod. Numa venda fiado, esse campo descreve só a ENTRADA — a parte financiada vai para a fatia "Crediário", que não é uma forma de pagamento e sim o valor que ainda não passou por método nenhum. O total fecha com o KPI "Receita total".'
      }
      segments={segments}
      loading={loading}
      showTotal
    />
  )
}
