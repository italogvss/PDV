import { useTheme } from '@mui/material'
import { BarPlot } from '@mui/x-charts/BarChart'
import { ChartsContainer } from '@mui/x-charts/ChartsContainer'
import { ChartsTooltip } from '@mui/x-charts/ChartsTooltip'
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis'
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis'
import ChartCard from '../../../components/ChartCard'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import type { ReceivableSchedulePoint } from '../../../types/report.types'

export interface ReceivableScheduleChartProps {
  data: ReceivableSchedulePoint[]
  loading?: boolean
}

// Único gráfico da página cujo eixo é o VENCIMENTO da parcela, não a data da venda nem a do
// recebimento — é uma previsão de entrada, não um fato consumado.
export default function ReceivableScheduleChart({
  data,
  loading = false,
}: ReceivableScheduleChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  // A barra "a vencer" mostra só a parte que ainda não venceu, para as duas empilhadas somarem
  // o saldo do bucket em vez de dobrarem o vencido.
  const upcoming = data.map((d) => d.dueAmount - d.overdueAmount)
  const overdue = data.map((d) => d.overdueAmount)

  return (
    <ChartCard
      title="Agenda de recebíveis"
      subtitle="Saldo em aberto por data de vencimento"
      info="Fonte: saldo das parcelas de crediário EM ABERTO, posicionado pela data de VENCIMENTO — é o único gráfico da página cujo eixo aponta para o futuro (os outros usam a data da venda ou do recebimento). Barra azul: ainda vai vencer. Barra vermelha: já venceu e não foi pago. Parcelas quitadas e de crediário cancelado ficam de fora. É previsão de entrada, não receita — nada aqui garante que o cliente vai pagar."
      loading={loading}
      isEmpty={data.every((d) => d.dueAmount === 0)}
    >
      <ChartsContainer
        height={300}
        margin={{ left: 0 }}
        xAxis={[{ id: 'x-axis', scaleType: 'band', data: labels }]}
        yAxis={[{ id: 'y-axis', width: 100, valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            type: 'bar',
            id: 'upcoming',
            data: upcoming,
            stack: 'receivable',
            label: 'A vencer',
            color: theme.palette.data.blue.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            type: 'bar',
            id: 'overdue',
            data: overdue,
            stack: 'receivable',
            label: 'Vencido',
            color: theme.palette.error.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
      >
        <BarPlot />
        <ChartsXAxis axisId="x-axis" />
        <ChartsYAxis axisId="y-axis" />
        <ChartsTooltip />
      </ChartsContainer>
    </ChartCard>
  )
}
