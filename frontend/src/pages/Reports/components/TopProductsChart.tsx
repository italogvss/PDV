import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { TopProduct } from '../../../types/report.types'

export interface TopProductsChartProps {
  data: TopProduct[]
  loading?: boolean
}

export default function TopProductsChart({ data, loading = false }: TopProductsChartProps) {
  const theme = useTheme()

  // Maior receita no topo (eixo de bandas é desenhado de baixo para cima)
  const sorted = [...data].sort((a, b) => a.revenue - b.revenue)
  const names = sorted.map((d) => d.productName)
  const revenue = sorted.map((d) => d.revenue)

  return (
    <ChartCard
      title="Top produtos vendidos"
      subtitle="Maior receita no período"
      loading={loading}
      isEmpty={data.length === 0}
    >
      <BarChart
        height={300}
        layout="horizontal"
        yAxis={[{ scaleType: 'band', data: names, width: 110 }]}
        xAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: revenue,
            label: 'Receita',
            color: theme.palette.data.teal.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 8 }}
        hideLegend
      />
    </ChartCard>
  )
}
