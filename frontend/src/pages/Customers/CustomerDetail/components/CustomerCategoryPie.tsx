import { useTheme } from '@mui/material'
import DonutChart from '../../../../components/DonutChart'
import type { CustomerCategorySlice } from '../../../../services/customer.service'

interface Props {
  title: string
  subtitle: string
  info?: string
  data: CustomerCategorySlice[] | undefined
  loading: boolean
  emptyText: string
}

export default function CustomerCategoryPie({ title, subtitle, info, data, loading, emptyText }: Props) {
  const theme = useTheme()

  const segments = (data ?? []).map((d) => ({
    label: d.name,
    value: d.total,
    color: d.color ?? theme.palette.secondary.main,
  }))

  return (
    <DonutChart
      title={title}
      subtitle={subtitle}
      info={info}
      segments={segments}
      loading={loading}
      emptyText={emptyText}
    />
  )
}
