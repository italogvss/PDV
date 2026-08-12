import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import { ACCRUAL_ONLY_NOTE } from './chartHelpers'
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
    // Devendo fiado é informação de risco: sem ela, quem só leva a prazo lidera o ranking de receita.
    secondaryText:
      c.outstanding > 0
        ? `${c.purchaseCount} compra${c.purchaseCount === 1 ? '' : 's'} · ${formatBRL(c.outstanding)} em aberto`
        : `${c.purchaseCount} compra${c.purchaseCount === 1 ? '' : 's'}`,
  }))

  return (
    <RankingList
      title="Top clientes por receita"
      subtitle="Maior receita no período"
      info={`Fonte: total das vendas ativas COM cliente vinculado (balcão anônimo fica fora), agrupado pelo cadastro do cliente. Ordena por quanto o cliente COMPROU, não por quanto pagou — por isso o "em aberto" ao lado: é o saldo de crediário que ele deve HOJE (posição atual, não do período). Cliente no topo com muito em aberto comprou bastante mas ainda não pagou. ${ACCRUAL_ONLY_NOTE}`}
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
