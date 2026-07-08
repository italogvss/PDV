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
      info="Receita de atendimentos concluídos no período por funcionário. A contagem inclui todos os agendamentos não cancelados atribuídos a ele."
      items={items}
      loading={loading}
      emptyText="Sem dados no período selecionado."
    />
  )
}
