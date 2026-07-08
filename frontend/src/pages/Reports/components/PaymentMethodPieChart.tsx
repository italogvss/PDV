import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_LABELS } from '../../../constants/payment'
import type { SalesByPaymentMethod } from '../../../types/report.types'

export interface PaymentMethodPieChartProps {
  data: SalesByPaymentMethod[]
  loading?: boolean
}

export default function PaymentMethodPieChart({
  data,
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
      info="Valor total recebido em cada forma de pagamento no período. Ajuda a ver a preferência dos clientes e onde há mais taxas."
      segments={segments}
      loading={loading}
      showTotal
    />
  )
}
