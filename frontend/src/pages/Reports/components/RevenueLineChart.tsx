import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from '../../../components/ChartCard'
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
  // Alinha a série anterior aos buckets do período atual (mesma posição relativa no ciclo) e
  // preenche com null quando o período anterior tem menos buckets — evita que o gráfico
  // descarte pontos ou associe a série anterior ao rótulo errado quando as contagens diferem.
  const prevRevenue: (number | null)[] = hasPrev
    ? labels.map((_, i) => prevData[i]?.revenue ?? null)
    : []

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
      info="Receita bruta — soma do total das vendas (já com os descontos aplicados) em cada período. Quando há comparação, a linha tracejada mostra o mesmo intervalo do período anterior."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{ width: 100,valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={series}
        margin={{ left: 0 }}
        sx={{
          '& .MuiAreaElement-series-current': { fillOpacity: 0.15 },
          '& .MuiLineElement-series-prev': { strokeDasharray: '8 4' },
        }}
      />
    </ChartCard>
  )
}
