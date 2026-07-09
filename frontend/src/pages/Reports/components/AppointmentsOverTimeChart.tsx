import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import ChartCard from '../../../components/ChartCard'
import type { AppointmentSummaryPoint } from '../../../types/report.types'

export interface AppointmentsOverTimeChartProps {
  data: AppointmentSummaryPoint[]
  loading?: boolean
}

export default function AppointmentsOverTimeChart({
  data,
  loading = false,
}: AppointmentsOverTimeChartProps) {
  const theme = useTheme()

  const labels = data.map((d) => d.label)
  const total = data.map((d) => d.total)
  const completed = data.map((d) => d.completed)
  const cancelled = data.map((d) => d.cancelled)

  return (
    <ChartCard
      title="Agendamentos ao longo do tempo"
      subtitle="Total, concluídos e cancelados por período"
      info="Quantidade de agendamentos por período. “Total” conta apenas os não cancelados (demanda real); a linha de cancelados é exibida à parte para acompanhar a tendência de cancelamento."
      loading={loading}
      isEmpty={data.length === 0}
    >
      <LineChart
        height={300}
        xAxis={[{ scaleType: 'point', data: labels }]}
        yAxis={[{ width: 40 }]}
        series={[
          {
            id: 'total',
            data: total,
            label: 'Total',
            color: theme.palette.data.blue.main,
            showMark: false,
          },
          {
            id: 'completed',
            data: completed,
            label: 'Concluídos',
            color: theme.palette.success.main,
            showMark: false,
          },
          {
            id: 'cancelled',
            data: cancelled,
            label: 'Cancelados',
            color: theme.palette.error.main,
            showMark: false,
          },
        ]}
        margin={{ left: 0 }}
      />
    </ChartCard>
  )
}
