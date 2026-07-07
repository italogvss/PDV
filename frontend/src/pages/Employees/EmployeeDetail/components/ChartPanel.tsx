import { Box, Card, CardContent, Divider, Skeleton, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import InfoTooltip from '../../../../components/InfoTooltip'

interface Props {
  title: string
  subtitle?: string
  /** Texto explicativo do gráfico, exibido num ícone de ajuda ao lado do título. */
  info?: string
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
  info,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
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
