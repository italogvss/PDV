import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { SalesByOperator } from '../../../types/report.types'

export interface OperatorRankingChartProps {
  data: SalesByOperator[]
  loading?: boolean
}

export default function OperatorRankingChart({
  data,
  loading = false,
}: OperatorRankingChartProps) {
  const theme = useTheme()

  // Maior receita no topo (eixo de bandas é desenhado de baixo para cima)
  const sorted = [...data].sort((a, b) => a.totalRevenue - b.totalRevenue)
  const names = sorted.map((d) => d.operatorName)
  const revenue = sorted.map((d) => d.totalRevenue)

  return (
    <ChartCard
      title="Ranking por operador"
      subtitle="Receita por operador no período"
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
            color: theme.palette.data.purple.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 8 }}
        hideLegend
      />
    </ChartCard>
  )
}
