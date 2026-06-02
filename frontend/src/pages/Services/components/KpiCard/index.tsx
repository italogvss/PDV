import { Card, CardContent, Box, Typography, Chip } from '@mui/material'
import type { KpiCardProps } from './types'

export default function KpiCard({
  label,
  icon: Icon,
  value,
  valueColor = 'default',
  badge,
}: KpiCardProps) {
  const BadgeIcon = badge.icon

  const valueColorMap = {
    default: 'text.primary',
    warning: 'warning.main',
    error: 'error.main',
  } as const

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
          color={valueColorMap[valueColor]}
          sx={{ lineHeight: 1, mb: 1.5 }}
        >
          {value}
        </Typography>

        <Chip
          size="small"
          color={badge.color}
          label={badge.label}
          icon={BadgeIcon ? <BadgeIcon /> : undefined}
          sx={
            BadgeIcon
              ? { '& .MuiChip-icon': { fontSize: '12px !important', color: 'inherit', ml: 0.75, mr: '-3px' } }
              : undefined
          }
        />
      </CardContent>
    </Card>
  )
}
