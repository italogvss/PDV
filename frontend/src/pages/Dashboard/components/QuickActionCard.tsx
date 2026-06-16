import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Box, Button, Card, CardContent, Chip, Skeleton, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type ChipColor = 'success' | 'warning' | 'error' | 'info' | 'default'

export interface QuickActionCardProps {
  title: string
  badge?: { label: string; color?: ChipColor }
  /** Conteúdo extra à direita do cabeçalho (ex.: grupo de avatares). */
  headerExtra?: ReactNode
  footerLabel: string
  onFooter: () => void
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  children: ReactNode
}

export default function QuickActionCard({
  title,
  badge,
  headerExtra,
  footerLabel,
  onFooter,
  loading = false,
  isEmpty = false,
  emptyText = 'Nada por aqui.',
  children,
}: QuickActionCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {headerExtra ?? (badge && <Chip size="small" color={badge.color ?? 'default'} label={badge.label} />)}
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading ? (
            <Skeleton variant="rounded" height={160} />
          ) : isEmpty ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {emptyText}
              </Typography>
            </Box>
          ) : (
            children
          )}
        </Box>

        <Button
          variant="text"
          color="inherit"
          endIcon={<ArrowForwardRounded />}
          onClick={onFooter}
          sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
        >
          {footerLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
