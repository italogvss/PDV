import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from '../../Reports/components/chartHelpers'
import ChartCard from '../../../components/ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface RevenueAreaChartProps {
  data: FinancialSummaryPoint[]
  days: number
  loading?: boolean
}

export default function RevenueAreaChart({ data, days, loading = false }: RevenueAreaChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const revenue = data.map((d) => d.revenue)
  const profit = data.map((d) => d.grossProfit)

  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <ChartCard
      title="Faturamento"
      subtitle={`Últimos ${days} dias • ${formatBRL(total)}`}
      info="Vendas é a receita bruta por dia. Lucro bruto é a margem dos itens com custo cadastrado (receita − custo) — não desconta taxas nem despesas (para o lucro líquido, veja o KPI “Lucro estimado”)."
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
            label: 'Vendas',
            color: theme.palette.success.main,
            area: true,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: profit,
            label: 'Lucro bruto',
            color: theme.palette.text.secondary,
            area: false,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 16 }}
        sx={{
          '& .MuiAreaElement-series-auto-generated-id-0, & .MuiAreaElement-root': {
            fillOpacity: 0.15,
          },
        }}
      />
    </ChartCard>
  )
}
