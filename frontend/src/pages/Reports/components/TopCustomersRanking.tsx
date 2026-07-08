import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { TopCustomer } from '../../../types/report.types'

export interface TopCustomersRankingProps {
  data: TopCustomer[]
  loading?: boolean
}

export default function TopCustomersRanking({ data, loading = false }: TopCustomersRankingProps) {
  const sorted = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const items = sorted.map((c) => ({
    id: c.customerId,
    label: c.name,
    value: c.totalRevenue,
    primaryText: formatBRL(c.totalRevenue),
    secondaryText: `${c.purchaseCount} compra${c.purchaseCount === 1 ? '' : 's'}`,
  }))

  return (
    <RankingList
      title="Top clientes por receita"
      subtitle="Maior receita no período"
      info="Clientes que mais geraram receita no período (soma do total das vendas, já com desconto aplicado). Considera apenas vendas com cliente vinculado — vendas de balcão sem cliente ficam fora."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
