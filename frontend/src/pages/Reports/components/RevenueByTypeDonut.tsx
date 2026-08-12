import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import { ACCRUAL_ONLY_NOTE } from './chartHelpers'
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
      info={`Fonte: itens das vendas ativas (SaleItem.Subtotal), separados por serviço × produto, com o desconto da venda rateado entre os itens. A soma das duas fatias fecha com o KPI "Receita total". ${ACCRUAL_ONLY_NOTE}`}
      segments={segments}
      loading={loading}
    />
  )
}
