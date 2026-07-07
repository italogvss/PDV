import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import ChartCard from './ChartCard'
import type { FinancialSummaryPoint } from '../../../types/report.types'

export interface AccumulatedProfitChartProps {
  data: FinancialSummaryPoint[]
  loading?: boolean
}

export default function AccumulatedProfitChart({
  data,
  loading = false,
}: AccumulatedProfitChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)

  // Soma cumulativa do resultado líquido ao longo do período
  let running = 0
  const accumulated = data.map((d) => {
    running += d.netResult
    return running
  })

  return (
    <ChartCard
      title="Lucro acumulado"
      subtitle="Resultado líquido somado no período"
      info="Soma corrida do resultado líquido, período a período. A curva subindo indica lucro se acumulando; descendo, prejuízo."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            data: accumulated,
            label: 'Lucro acumulado',
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
