import { Box, Typography, useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import type { EmployeePerformanceStats } from '../../../../services/employee.service'
import { formatBRL } from '../../../../utils/currency'
import { formatCompactBRL } from '../../../../utils/chart'
import ChartPanel from './ChartPanel'

interface Props {
  stats: EmployeePerformanceStats | undefined
  statsLoading: boolean
}

export default function SalaryVsRevenueCard({ stats, statsLoading }: Props) {
  const theme = useTheme()
  const salary = stats?.monthlySalary ?? 0
  const revenue = stats?.salesThisMonth ?? 0
  const net = revenue - salary

  return (
    <ChartPanel
      title="Salário × Receita gerada"
      subtitle="Custo fixo e receita operada no mês atual"
      info="Compara o salário mensal (custo fixo) com a receita que o funcionário operou no caixa no mês atual. A margem é a diferença entre os dois — não considera comissões nem outros custos."
      loading={statsLoading}
      isEmpty={salary <= 0 && revenue <= 0}
      emptyText="Sem salário configurado ou vendas no mês."
      height={260}
    >
      <BarChart
        height={240}
        xAxis={[
          {
            scaleType: 'band',
            data: ['Salário', 'Receita gerada'],
            colorMap: { type: 'ordinal', colors: [theme.palette.warning.main, theme.palette.success.main] },
          },
        ]}
        yAxis={[{ width: 70, valueFormatter: (v: number | null) => formatCompactBRL(v) }]}
        series={[{ data: [salary, revenue], valueFormatter: (v) => formatBRL(v ?? 0) }]}
        margin={{ left: 0 }}
        hideLegend
      />
      {salary > 0 && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Margem no mês
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: net >= 0 ? 'success.main' : 'error.main' }} >
            {formatBRL(net)}
          </Typography>
        </Box>
      )}
    </ChartPanel>
  )
}
