import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from '../../../components/ChartCard'
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
      title="Receita × Lucro líquido"
      subtitle="Resultado = margem (itens com custo) − taxas − despesas"
      info="Receita é o total vendido no período. Lucro líquido = margem dos itens com custo cadastrado − taxas das formas de pagamento − despesas. Produtos sem custo cadastrado não entram na margem."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <BarChart
        height={300}
        xAxis={[{ scaleType: 'band', data: labels }]}
        yAxis={[{ width: 100, valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: revenue,
            label: 'Receita',
            color: theme.palette.data.blue.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            id: 'netResult',
            data: netResult,
            label: 'Lucro líquido',
            color: theme.palette.success.main ,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 0 }}
        slotProps={{
          bar: (ownerState) =>
            ownerState.seriesId === 'netResult' && (netResult[ownerState.dataIndex] ?? 0) < 0
              ? { fill: theme.palette.error.main }
              : {},
        }}
      />
    </ChartCard>
  )
}
