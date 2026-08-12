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
      info="Fonte: hora de início dos agendamentos não cancelados do período, contados de 0h a 23h. Ajuda a dimensionar a equipe nos horários de pico. Atenção: as horas são gravadas em UTC e exibidas sem conversão de fuso, então perto da virada do dia o horário pode aparecer deslocado."
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
