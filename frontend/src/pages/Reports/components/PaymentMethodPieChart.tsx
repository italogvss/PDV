import { useTheme } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import { formatBRL } from '../../../utils/currency'
import { categoricalColors, PAYMENT_METHOD_LABELS } from './chartHelpers'
import ChartCard from './ChartCard'
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
  const colors = categoricalColors(theme)

  const slices = data.map((d, i) => ({
    id: d.paymentMethod,
    value: d.total,
    label: PAYMENT_METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod,
    color: colors[i % colors.length],
  }))

  return (
    <ChartCard
      title="Vendas por forma de pagamento"
      loading={loading}
      isEmpty={data.length === 0}
    >
      <PieChart
        height={300}
        series={[
          {
            data: slices,
            innerRadius: 55,
            paddingAngle: 2,
            cornerRadius: 4,
            valueFormatter: (item) => formatBRL(item.value),
          },
        ]}
      />
    </ChartCard>
  )
}
