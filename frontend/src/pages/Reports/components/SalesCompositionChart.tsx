import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from '../../../components/ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface SalesCompositionChartProps {
  data: FinancialSummaryPoint[]
  loading?: boolean
}

export default function SalesCompositionChart({ data, loading = false }: SalesCompositionChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const cost = data.map((d) => d.cost)
  const fees = data.map((d) => d.fees)
  const expenses = data.map((d) => d.expenses)
  const netResult = data.map((d) => d.netResult)

  return (
    <ChartCard
      title="Composição do resultado"
      subtitle="Para onde foi a receita em cada período"
      info="Divide a receita dos itens com custo cadastrado em custo, taxas das formas de pagamento, despesas e resultado líquido. Produtos sem custo cadastrado não entram na composição — nesses casos a barra fica menor que a receita total do período."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <BarChart
        height={300}
        xAxis={[{ scaleType: 'band', data: labels }]}
        yAxis={[{ width: 100, valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: cost,
            label: 'Custo',
            stack: 'a',
            color: theme.palette.data.orange.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: fees,
            label: 'Taxas',
            stack: 'a',
            color: theme.palette.data.purple.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: expenses,
            label: 'Despesas',
            stack: 'a',
            color: theme.palette.data.red.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: netResult,
            label: 'Lucro líquido',
            stack: 'a',
            color: theme.palette.success.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 0 }}
      />
    </ChartCard>
  )
}
