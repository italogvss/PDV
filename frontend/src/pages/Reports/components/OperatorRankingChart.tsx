import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { SalesByOperator } from '../../../types/report.types'

export interface OperatorRankingChartProps {
  data: SalesByOperator[]
  loading?: boolean
}

export default function OperatorRankingChart({
  data,
  loading = false,
}: OperatorRankingChartProps) {
  const sorted = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const items = sorted.map((op) => ({
    id: op.operatorId,
    label: op.operatorName,
    value: op.totalRevenue,
    primaryText: formatBRL(op.totalRevenue),
    secondaryText: `${op.totalSales} vendas`,
  }))

  return (
    <RankingList
      title="Ranking por operador"
      subtitle="Receita por operador no período"
      info="Receita total das vendas registradas por cada operador no caixa durante o período."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
