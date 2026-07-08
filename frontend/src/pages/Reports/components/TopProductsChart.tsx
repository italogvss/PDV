import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { TopProduct } from '../../../types/report.types'

export interface TopProductsChartProps {
  data: TopProduct[]
  loading?: boolean
}

export default function TopProductsChart({ data, loading = false }: TopProductsChartProps) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const items = sorted.map((p) => ({
    id: p.productName,
    label: p.productName,
    value: p.revenue,
    primaryText: formatBRL(p.revenue),
    secondaryText: `${p.quantity}×`,
  }))

  return (
    <RankingList
      title="Top produtos vendidos"
      subtitle="Maior receita no período"
      info="Produtos com maior receita no período, já com o desconto rateado. Considera apenas produtos — serviços não entram neste ranking."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
