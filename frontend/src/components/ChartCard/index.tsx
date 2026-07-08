import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material'
import InfoTooltip from '../InfoTooltip'
import type { ChartCardProps } from './types'

export default function ChartCard({
  title,
  subtitle,
  info,
  action,
  loading = false,
  isEmpty = false,
  emptyText = 'Sem dados no período selecionado.',
  height = 300,
  children,
}: ChartCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            mb: 2,
            minHeight: 32,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {info && <InfoTooltip title={info} />}
            </Box>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>

        {loading ? (
          <Skeleton variant="rounded" height={height} />
        ) : isEmpty ? (
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
