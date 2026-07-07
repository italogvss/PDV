import { Box, Card, CardContent, Divider, Skeleton, Typography, useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import InfoTooltip from '../../../../components/InfoTooltip'
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Linha do tempo de gastos
          </Typography>
          <InfoTooltip title="Total gasto pelo cliente a cada mês nos últimos 12 meses, considerando as compras no caixa já com descontos." />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Total gasto por mês · últimos 12 meses
        </Typography>
      </CardContent>
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        {statsLoading ? (
          <Skeleton variant="rounded" height={260} />
        ) : data.length > 0 ? (
          <BarChart
            height={260}
            borderRadius={10}
            xAxis={[{ scaleType: 'band', data: labels, tickPlacement: 'end' }]}
            yAxis={[{ width: 70,valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
            series={[
              {
              
                data: totals,
                label: 'Gasto',
                color: theme.palette.secondary.main,
                valueFormatter: (v: number | null) => formatBRL(v ?? 0),
              },
            ]}
            margin={{ left: 16 }}
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
