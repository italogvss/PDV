import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import ChartCard from './ChartCard'
import type { CustomerNewVsReturningPoint } from '../../../types/report.types'

export interface CustomerNewVsReturningChartProps {
  data: CustomerNewVsReturningPoint[]
  loading?: boolean
}

export default function CustomerNewVsReturningChart({
  data,
  loading = false,
}: CustomerNewVsReturningChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const newCustomers = data.map((d) => d.newCustomers)
  const returningCustomers = data.map((d) => d.returningCustomers)

  const isEmpty = data.length === 0 || data.every((d) => d.newCustomers + d.returningCustomers === 0)

  return (
    <ChartCard
      title="Clientes novos vs recorrentes"
      subtitle="Clientes identificados nas vendas, por período"
      loading={loading}
      isEmpty={isEmpty}
      emptyText="Nenhuma venda com cliente identificado no período."
    >
      <BarChart
        height={300}
        xAxis={[{ scaleType: 'band', data: labels }]}
        yAxis={[{ valueFormatter: (v: number | null) => String(v ?? 0) }]}
        series={[
          {
            data: newCustomers,
            label: 'Novos',
            color: theme.palette.success.main,
            stack: 'customers',
            valueFormatter: (v) => `${v ?? 0} cliente${(v ?? 0) !== 1 ? 's' : ''}`,
          },
          {
            data: returningCustomers,
            label: 'Recorrentes',
            color: theme.palette.data.blue.main,
            stack: 'customers',
            valueFormatter: (v) => `${v ?? 0} cliente${(v ?? 0) !== 1 ? 's' : ''}`,
          },
        ]}
        margin={{ left: 16 }}
      />
    </ChartCard>
  )
}
