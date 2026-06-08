import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface FinancialBarChartProps {
  data: FinancialSummaryPoint[]
  loading?: boolean
}

export default function FinancialBarChart({ data, loading = false }: FinancialBarChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const revenue = data.map((d) => d.revenue)
  const netResult = data.map((d) => d.netResult)

  return (
    <ChartCard
      title="Receita × Resultado líquido"
      subtitle="Receita − custo dos produtos − despesas"
      loading={loading}
      isEmpty={data.length === 0}
    >
      <BarChart
        height={300}
        xAxis={[{ scaleType: 'band', data: labels }]}
        yAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: revenue,
            label: 'Receita',
            color: theme.palette.success.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: netResult,
            label: 'Resultado líquido',
            color: theme.palette.data.blue.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 16 }}
      />
    </ChartCard>
  )
}
