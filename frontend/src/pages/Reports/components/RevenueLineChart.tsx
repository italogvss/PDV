import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface RevenueLineChartProps {
  data: FinancialSummaryPoint[]
  loading?: boolean
}

export default function RevenueLineChart({ data, loading = false }: RevenueLineChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const revenue = data.map((d) => d.revenue)

  return (
    <ChartCard
      title="Receita ao longo do tempo"
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: revenue,
            label: 'Receita',
            color: theme.palette.success.main,
            area: true,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 16 }}
        sx={{
          '& .MuiAreaElement-root': { fillOpacity: 0.15 },
        }}
      />
    </ChartCard>
  )
}
