import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import type { RevenueByType } from '../../../types/report.types'

export interface RevenueByTypeDonutProps {
  data?: RevenueByType
  loading?: boolean
}

export default function RevenueByTypeDonut({ data, loading = false }: RevenueByTypeDonutProps) {
  const theme = useTheme()

  const segments = [
    {
      label: 'Serviços',
      value: data?.servicesRevenue ?? 0,
      color: theme.palette.data.purple.main,
    },
    {
      label: 'Produtos',
      value: data?.productsRevenue ?? 0,
      color: theme.palette.data.blue.main,
    },
  ]

  return (
    <DonutChart
      title="Serviços vs Produtos"
      subtitle="Participação na receita do período"
      info="Divisão da receita entre serviços e produtos, com o desconto de cada venda rateado entre os itens. A soma equivale à receita total do período."
      segments={segments}
      loading={loading}
    />
  )
}
