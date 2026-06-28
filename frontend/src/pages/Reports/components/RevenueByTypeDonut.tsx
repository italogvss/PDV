import { useTheme } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import { formatBRL } from '../../../utils/currency'
import ChartCard from './ChartCard'
import type { RevenueByType } from '../../../types/report.types'

export interface RevenueByTypeDonutProps {
  data?: RevenueByType
  loading?: boolean
}

export default function RevenueByTypeDonut({ data, loading = false }: RevenueByTypeDonutProps) {
  const theme = useTheme()

  const total = (data?.servicesRevenue ?? 0) + (data?.productsRevenue ?? 0)
  const isEmpty = !data || total === 0

  const slices = [
    {
      id: 'services',
      value: data?.servicesRevenue ?? 0,
      label: 'Serviços',
      color: theme.palette.data.purple.main,
    },
    {
      id: 'products',
      value: data?.productsRevenue ?? 0,
      label: 'Produtos',
      color: theme.palette.data.blue.main,
    },
  ]

  return (
    <ChartCard
      title="Serviços vs Produtos"
      subtitle="Participação na receita do período"
      loading={loading}
      isEmpty={isEmpty}
      height={220}
    >
      <PieChart
        height={220}
        series={[
          {
            data: slices,
            innerRadius: 50,
            paddingAngle: 2,
            cornerRadius: 4,
            valueFormatter: (item) => formatBRL(item.value),
          },
        ]}
      />
    </ChartCard>
  )
}
