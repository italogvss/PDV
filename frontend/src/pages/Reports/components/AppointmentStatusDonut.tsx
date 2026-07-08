import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import type { AppointmentSummaryPoint } from '../../../types/report.types'

export interface AppointmentStatusDonutProps {
  data: AppointmentSummaryPoint[]
  loading?: boolean
}

export default function AppointmentStatusDonut({
  data,
  loading = false,
}: AppointmentStatusDonutProps) {
  const theme = useTheme()

  const totals = data.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      cancelled: acc.cancelled + d.cancelled,
      inProgress: acc.inProgress + d.inProgress,
      pending: acc.pending + d.pending,
    }),
    { completed: 0, cancelled: 0, inProgress: 0, pending: 0 },
  )

  const segments = [
    { label: 'Concluídos', value: totals.completed, color: theme.palette.success.main },
    { label: 'Cancelados', value: totals.cancelled, color: theme.palette.error.main },
    { label: 'Em atendimento', value: totals.inProgress, color: theme.palette.info.main },
    { label: 'Pendentes/Confirmados', value: totals.pending, color: theme.palette.warning.main },
  ]

  return (
    <DonutChart
      title="Agendamentos por status"
      subtitle="Distribuição no período"
      info="Quantidade de agendamentos em cada status no período. Pendentes e confirmados são somados por ainda não terem acontecido."
      segments={segments}
      loading={loading}
      showTotal
      totalLabel="Agendamentos"
      valueFormatter={(v) => String(v)}
    />
  )
}
