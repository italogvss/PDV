import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface RevenueLineChartProps {
  data: FinancialSummaryPoint[]
  prevData?: FinancialSummaryPoint[]
  loading?: boolean
}

export default function RevenueLineChart({
  data,
  prevData,
  loading = false,
}: RevenueLineChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const revenue = data.map((d) => d.revenue)

  const hasPrev = prevData && prevData.length > 0
  const prevRevenue = hasPrev ? prevData.map((d) => d.revenue) : []

  const series = [
    {
      id: 'current',
      data: revenue,
      label: 'Receita',
      color: theme.palette.success.main,
      area: true,
      showMark: false,
      valueFormatter: (v: number | null) => formatBRL(v ?? 0),
    },
    ...(hasPrev
      ? [
          {
            id: 'prev',
            data: prevRevenue,
            label: 'Período anterior',
            color: theme.palette.text.disabled,
            area: false,
            showMark: false,
            valueFormatter: (v: number | null) => formatBRL(v ?? 0),
          },
        ]
      : []),
  ]

  return (
    <ChartCard
      title="Receita ao longo do tempo"
      subtitle={hasPrev ? 'vs período anterior' : undefined}
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={series}
        margin={{ left: 16 }}
        sx={{
          '& .MuiAreaElement-series-current': { fillOpacity: 0.15 },
          '& .MuiLineElement-series-prev': { strokeDasharray: '8 4' },
        }}
      />
    </ChartCard>
  )
}
