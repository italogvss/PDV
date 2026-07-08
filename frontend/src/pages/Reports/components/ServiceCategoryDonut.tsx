import { useTheme } from '@mui/material'
import DonutChart from '../../../components/DonutChart'
import type { ServiceCategoryRevenue } from '../../../types/report.types'

export interface ServiceCategoryDonutProps {
  data: ServiceCategoryRevenue[]
  loading?: boolean
}

export default function ServiceCategoryDonut({ data, loading = false }: ServiceCategoryDonutProps) {
  const theme = useTheme()

  const segments = data.map((d) => ({
    label: d.category,
    value: d.total,
    color: d.color ?? theme.palette.neutral[500],
  }))

  return (
    <DonutChart
      title="Categorias de serviço"
      subtitle="Participação na receita de atendimentos"
      info="Receita de serviços concluídos no período, somada por categoria do catálogo. Agendamentos futuros, pendentes ou cancelados não entram — só consumo real."
      segments={segments}
      loading={loading}
      showTotal
    />
  )
}
