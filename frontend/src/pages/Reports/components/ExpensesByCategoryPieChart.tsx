import { useTheme } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import { formatBRL } from '../../../utils/currency'
import { categoricalColors } from './chartHelpers'
import { EXPENSE_CATEGORY_LABELS } from '../../Expenses/types'
import ChartCard from './ChartCard'
import type { ExpensesByCategory } from '../../../types/report.types'

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => [k, v.label])
)

export interface ExpensesByCategoryPieChartProps {
  data: ExpensesByCategory[]
  loading?: boolean
}

export default function ExpensesByCategoryPieChart({
  data,
  loading = false,
}: ExpensesByCategoryPieChartProps) {
  const theme = useTheme()
  const colors = categoricalColors(theme)

  const slices = data.map((d, i) => ({
    id: d.category,
    value: d.total,
    label: CATEGORY_LABELS[d.category] ?? d.category,
    color: colors[i % colors.length],
  }))

  return (
    <ChartCard title="Despesas por categoria" loading={loading} isEmpty={data.length === 0}>
      <PieChart
        height={300}
        series={[
          {
            data: slices,
            innerRadius: 55,
            paddingAngle: 2,
            cornerRadius: 4,
            valueFormatter: (item) => formatBRL(item.value),
          },
        ]}
      />
    </ChartCard>
  )
}
