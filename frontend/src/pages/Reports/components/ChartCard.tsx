import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material'
import type { ReactNode } from 'react'

export interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  height?: number
  children: ReactNode
}

export default function ChartCard({
  title,
  subtitle,
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
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
