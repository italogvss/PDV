import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import { ACCRUAL_ONLY_NOTE } from './chartHelpers'
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
      info={`Fonte: itens de PRODUTO das vendas ativas, com o desconto da venda rateado por item. Serviços não entram. Agrupado pelo produto do catálogo (não pelo nome), com o rótulo do nome mais recente — renomear um produto não fragmenta o histórico. ${ACCRUAL_ONLY_NOTE}`}
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
