import { useTheme } from '@mui/material'
import { BarPlot } from '@mui/x-charts/BarChart'
import { ChartsContainer } from '@mui/x-charts/ChartsContainer'
import { ChartsTooltip } from '@mui/x-charts/ChartsTooltip'
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis'
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis'
import { LinePlot, MarkPlot } from '@mui/x-charts/LineChart'
import ChartCard from '../../../components/ChartCard'
import { formatBRL } from '../../../utils/currency'
import { formatCompactBRL } from './chartHelpers'
import type { AppointmentSummaryPoint } from '../../../types/report.types'

export interface AppointmentRevenueChartProps {
  data: AppointmentSummaryPoint[]
  loading?: boolean
}

export default function AppointmentRevenueChart({
  data,
  loading = false,
}: AppointmentRevenueChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const realized = data.map((d) => d.revenueRealized)
  const total = data.map((d) => d.revenueTotal)

  return (
    <ChartCard
      title="Receita de agendamentos"
      subtitle="Realizada (concluídos) × total agendado"
      info="Barras: soma do valor do agendamento (Appointment.Price) só para atendimentos concluídos. Linha: soma do valor de todos os agendamentos do período, independente do status. É o valor estimado no agendamento — pode diferir do que é de fato cobrado na venda no caixa."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <ChartsContainer
        height={300}
        margin={{ left: 0 }}
        xAxis={[{ id: 'x-axis', scaleType: 'band', data: labels }]}
        yAxis={[{ id: 'y-axis', width: 100, valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[
          {
            type: 'bar',
            id: 'realized',
            data: realized,
            label: 'Receita realizada',
            color: theme.palette.data.blue.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            type: 'line',
            id: 'total',
            data: total,
            label: 'Receita total agendada',
            color: theme.palette.data.orange.main,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
      >
        <BarPlot />
        <LinePlot />
        <MarkPlot />
        <ChartsXAxis axisId="x-axis" />
        <ChartsYAxis axisId="y-axis" />
        <ChartsTooltip />
      </ChartsContainer>
    </ChartCard>
  )
}
