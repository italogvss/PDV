import { Box, Card, CardContent, Divider, Skeleton, Typography, useTheme } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import type { CustomerCategorySlice } from '../../../../services/customer.service'
import { formatBRL } from '../../../../utils/currency'

interface Props {
  title: string
  subtitle: string
  data: CustomerCategorySlice[] | undefined
  loading: boolean
  emptyText: string
}

export default function CustomerCategoryPie({ title, subtitle, data, loading, emptyText }: Props) {
  const theme = useTheme()

  const slices = (data ?? []).map((d, i) => ({
    id: d.name,
    value: d.total,
    label: d.name,
    color: d.color ?? theme.palette.secondary.main,
  }))

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        {loading ? (
          <Skeleton variant="rounded" height={260} />
        ) : slices.length > 0 ? (
          <PieChart
            height={260}
            series={[
              {
                data: slices,
                innerRadius: 55,
                paddingAngle: 2,
                cornerRadius: 4,
                valueFormatter: (item) => formatBRL(item.value),
              },
            ]}
          />
        ) : (
          <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              {emptyText}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  )
}
