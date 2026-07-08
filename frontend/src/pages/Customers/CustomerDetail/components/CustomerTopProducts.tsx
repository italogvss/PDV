import RankingList from '../../../../components/RankingList'
import type { CustomerCrmStats } from '../../../../services/customer.service'
import { formatBRL } from '../../../../utils/currency'

interface Props {
  stats: CustomerCrmStats | undefined
  statsLoading: boolean
}

export default function CustomerTopProducts({ stats, statsLoading }: Props) {
  const items = (stats?.topProducts ?? []).map((p) => ({
    id: p.productName,
    label: p.productName,
    value: p.quantity,
    primaryText: formatBRL(p.totalSpent),
    secondaryText: `${p.quantity}×`,
  }))

  return (
    <RankingList
      title="Top produtos comprados"
      subtitle="Por volume · todos os períodos"
      items={items}
      loading={statsLoading}
      emptyText="Nenhuma compra registrada"
    />
  )
}
