import { Box, Card, CardContent, Chip, Skeleton, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { PageKpiCardBadge, Props } from './types'

const BADGE_ICON_SX = {
  '& .MuiChip-icon': {
    fontSize: '12px !important',
    color: 'inherit',
    ml: 0.75,
    mr: '-3px',
  },
}

const VALUE_COLOR: Record<NonNullable<Props['valueColor']>, string> = {
  warning: 'warning.main',
  error: 'error.main',
}

export default function PageKpiCard({ icon: Icon, label, value, valueColor, badge, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rounded" height={120} />
  }

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Icon sx={{ fontSize: 15, color: 'text.tertiary' }} />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>

        <Typography
          variant="h1"
          color={valueColor ? VALUE_COLOR[valueColor] : 'text.primary'}
          sx={{ lineHeight: 1, mb: badge ? 1.5 : 0 }}
        >
          {value}
        </Typography>

        {badge && <BadgeChip badge={badge} />}
      </CardContent>
    </Card>
  )
}

function BadgeChip({ badge }: { badge: PageKpiCardBadge }) {
  const BadgeIcon = badge.icon
  return (
    <Chip
      size="small"
      color={badge.color ?? 'default'}
      label={badge.label}
      icon={BadgeIcon ? <BadgeIcon /> : undefined}
      sx={BadgeIcon ? BADGE_ICON_SX : undefined}
    />
  )
}

export function PageKpiGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      {children}
    </Box>
  )
}
