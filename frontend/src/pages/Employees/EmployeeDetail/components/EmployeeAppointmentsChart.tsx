import { useMemo, useState } from 'react'
import { useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import type { EmployeePerformanceStats } from '../../../../services/employee.service'
import { bucketAppointments, type Granularity } from './analytics'
import ChartPanel from './ChartPanel'
import GranularityToggle from './GranularityToggle'

interface Props {
  stats: EmployeePerformanceStats | undefined
  statsLoading: boolean
}

export default function EmployeeAppointmentsChart({ stats, statsLoading }: Props) {
  const theme = useTheme()
  const [granularity, setGranularity] = useState<Granularity>('3m')

  const series = useMemo(
    () => bucketAppointments(stats?.dailyAppointments ?? [], granularity),
    [stats, granularity],
  )

  return (
    <ChartPanel
      title="Agendamentos por status"
      subtitle="Volume e qualidade do atendimento por período"
      action={<GranularityToggle value={granularity} onChange={setGranularity} />}
      loading={statsLoading}
      isEmpty={!series.hasData}
      emptyText="Nenhum agendamento no período."
    >
      <BarChart
        height={280}
        xAxis={[{ scaleType: 'band', data: series.labels }]}
        series={[
          { data: series.completed, label: 'Concluído', stack: 'a', color: theme.palette.success.main },
          { data: series.inProgress, label: 'Em atendimento', stack: 'a', color: theme.palette.data.blue.main },
          { data: series.scheduled, label: 'Agendado', stack: 'a', color: theme.palette.neutral[400] },
          { data: series.cancelled, label: 'Cancelado', stack: 'a', color: theme.palette.error.main },
        ]}
        margin={{ left: 16 }}
      />
    </ChartPanel>
  )
}
