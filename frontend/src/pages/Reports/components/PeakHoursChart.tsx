import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import ChartCard from '../../../components/ChartCard'
import type { AppointmentPeakHour } from '../../../types/report.types'

export interface PeakHoursChartProps {
  data: AppointmentPeakHour[]
  loading?: boolean
}

export default function PeakHoursChart({ data, loading = false }: PeakHoursChartProps) {
  const theme = useTheme()

  const sorted = [...data].sort((a, b) => a.hour - b.hour)
  const labels = sorted.map((d) => `${d.hour}h`)
  const counts = sorted.map((d) => d.count)
  const hasData = sorted.some((d) => d.count > 0)

  return (
    <ChartCard
      title="Horário de pico"
      subtitle="Agendamentos por hora do dia"
      info="Quantidade de agendamentos não cancelados por hora de início, no período. Ajuda a identificar os horários de maior demanda para dimensionar a equipe."
      loading={loading}
      isEmpty={!hasData}
      height={280}
    >
      <BarChart
        height={280}
        xAxis={[{ scaleType: 'band', data: labels }]}
        yAxis={[{ width: 40 }]}
        series={[
          {
            data: counts,
            label: 'Agendamentos',
            color: theme.palette.data.teal.main,
          },
        ]}
        margin={{ left: 0 }}
      />
    </ChartCard>
  )
}
