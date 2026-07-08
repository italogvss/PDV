import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { TopService } from '../../../types/report.types'

export interface TopServicesRankingProps {
  data: TopService[]
  loading?: boolean
}

export default function TopServicesRanking({ data, loading = false }: TopServicesRankingProps) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const items = sorted.map((s) => ({
    id: s.serviceId,
    label: s.serviceName,
    value: s.revenue,
    primaryText: formatBRL(s.revenue),
    secondaryText: `${s.count}×`,
  }))

  return (
    <RankingList
      title="Top serviços"
      subtitle="Maior receita realizada no período"
      info="Serviços com maior receita no período (só atendimentos concluídos). A contagem inclui todos os agendamentos não cancelados do serviço. Agrupado pelo serviço do catálogo, não pelo nome — não fragmenta se o serviço for renomeado."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
