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
      info="Fonte: serviços dos agendamentos do período. A RECEITA soma só os atendimentos concluídos; a CONTAGEM ao lado inclui todos os não cancelados — por isso um serviço pode ter muitos agendamentos e pouca receita (ainda não foram atendidos). Agrupado pelo serviço do catálogo, não pelo nome — renomear não fragmenta o histórico."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
