import { Box, Card, CardContent, Divider, Skeleton, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  height?: number
  children: ReactNode
}

export default function ChartPanel({
  title,
  subtitle,
  action,
  loading = false,
  isEmpty = false,
  emptyText = 'Sem dados no período selecionado.',
  height = 280,
  children,
}: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      </CardContent>
      <Divider />
      <Box sx={{ px: 2, py: 2 }}>
        {loading ? (
          <Skeleton variant="rounded" height={height} />
        ) : isEmpty ? (
          <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              {emptyText}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Card>
  )
}
