import { useMemo, useState } from 'react'
import { useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import type { EmployeePerformanceStats } from '../../../../services/employee.service'
import { formatBRL } from '../../../../utils/currency'
import { formatCompactBRL } from '../../../../utils/chart'
import { bucketSales, type Granularity } from './analytics'
import ChartPanel from './ChartPanel'
import GranularityToggle from './GranularityToggle'

interface Props {
  stats: EmployeePerformanceStats | undefined
  statsLoading: boolean
}

export default function EmployeeSalesChart({ stats, statsLoading }: Props) {
  const theme = useTheme()
  const [granularity, setGranularity] = useState<Granularity>('30d')

  const series = useMemo(
    () => bucketSales(stats?.dailySales ?? [], granularity),
    [stats, granularity],
  )

  return (
    <ChartPanel
      title="Vendas no caixa"
      subtitle="Receita operada e ticket médio por período"
      action={<GranularityToggle value={granularity} onChange={setGranularity} />}
      loading={statsLoading}
      isEmpty={!series.hasData}
      emptyText="Nenhuma venda operada no período."
    >
      <LineChart
        height={280}
        xAxis={[{ scaleType: 'point', data: series.labels }]}
        yAxis={[
          { id: 'money', position: 'left', valueFormatter: (v: number | null) => formatCompactBRL(v) },
          { id: 'ticket', position: 'right', valueFormatter: (v: number | null) => formatCompactBRL(v) },
        ]}
        series={[
          {
            data: series.totals,
            label: 'Receita',
            yAxisId: 'money',
            color: theme.palette.success.main,
            area: true,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
          {
            data: series.tickets,
            label: 'Ticket médio',
            yAxisId: 'ticket',
            color: theme.palette.data.blue.main,
            showMark: false,
            valueFormatter: (v) => formatBRL(v ?? 0),
          },
        ]}
        margin={{ left: 16, right: 16 }}
        sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.12 } }}
      />
    </ChartPanel>
  )
}
