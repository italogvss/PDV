import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { AppointmentsByEmployee } from '../../../types/report.types'

export interface EmployeeAppointmentsRankingProps {
  data: AppointmentsByEmployee[]
  loading?: boolean
}

export default function EmployeeAppointmentsRanking({
  data,
  loading = false,
}: EmployeeAppointmentsRankingProps) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const items = sorted.map((e) => ({
    id: e.employeeId,
    label: e.employeeName,
    value: e.revenue,
    primaryText: formatBRL(e.revenue),
    secondaryText: `${e.count} agend.`,
  }))

  return (
    <RankingList
      title="Agendamentos por funcionário"
      subtitle="Receita realizada por profissional"
      info="Fonte: agendamentos atribuídos a cada funcionário no período. A RECEITA soma o preço dos serviços dos atendimentos concluídos; a CONTAGEM inclui todos os não cancelados atribuídos a ele. Não tem relação com vendas no caixa — para isso, veja o “Ranking por operador”."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
