import { Box, Card, CardContent, Divider, Skeleton, Typography, useTheme } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import type { CustomerCrmStats } from '../../../../services/customer.service'
import { formatBRL } from '../../../../utils/currency'
import { formatCompactBRL } from '../../../../utils/chart'

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return `${MONTHS_PT[Number(month) - 1]}/${year.slice(2)}`
}

interface Props {
  stats: CustomerCrmStats | undefined
  statsLoading: boolean
}

export default function CustomerSpendTimeline({ stats, statsLoading }: Props) {
  const theme = useTheme()
  const data = stats?.monthlySpend ?? []
  const labels = data.map((d) => monthLabel(d.month))
  const totals = data.map((d) => d.total)

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Linha do tempo de gastos
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total gasto por mês · últimos 12 meses
        </Typography>
      </CardContent>
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        {statsLoading ? (
          <Skeleton variant="rounded" height={260} />
        ) : data.length > 0 ? (
          <LineChart
            height={260}
            xAxis={[{ scaleType: 'point', data: labels }]}
            yAxis={[{ valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
            series={[
              {
                data: totals,
                label: 'Gasto',
                color: theme.palette.success.main,
                area: true,
                showMark: data.length === 1,
                valueFormatter: (v) => formatBRL(v ?? 0),
              },
            ]}
            margin={{ left: 16 }}
            sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.15 } }}
          />
        ) : (
          <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Nenhuma compra registrada
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  )
}
