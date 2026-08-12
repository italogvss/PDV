import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import type { FinancialSummaryPoint, ReportBasis } from '../../../types/report.types'
import { formatBRL } from '../../../utils/currency'
import ChartCard from '../../../components/ChartCard'
import { basisNote, formatCompactBRL } from './chartHelpers'

export interface AccumulatedProfitChartProps {
  data: FinancialSummaryPoint[]
  basis: ReportBasis
  loading?: boolean
}

export default function AccumulatedProfitChart({
  data,
  basis,
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
      info={`Soma corrida do resultado líquido (margem dos itens com custo − taxas − despesas), período a período. Curva subindo = lucro se acumulando; descendo = prejuízo. Só acumula dentro do intervalo escolhido, não vem de antes dele. ${basisNote(basis)}`}
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{
          width: 100, valueFormatter: (v: number | null) => formatCompactBRL(v),
          colorMap: {
            type: 'piecewise',
            thresholds: [0],
            colors: [theme.palette.error.main, theme.palette.success.main, theme.palette.data.blue.main],
          }
        }]}
        series={[
          {
            data: accumulated,
            label: 'Lucro acumulado',
            color: theme.palette.success.main,
            area: false,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 0 }}
        sx={{
          '& .MuiAreaElement-root': { fillOpacity: 0.15 },
        }}
      />
    </ChartCard>
  )
}
