import { Card, CardContent, Box, Typography, Chip } from '@mui/material'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'

export interface DashboardMetricCardProps {
  icon: React.ComponentType<any>
  label: string
  value: string
  change: number
  changeLabel: string
  isPositive?: boolean
}

const CHIP_ICON_SX = {
  '& .MuiChip-icon': {
    fontSize: '12px !important',
    color: 'inherit',
    ml: 0.75,
    mr: '-3px',
  },
}

export default function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  changeLabel,
  isPositive = true,
}: DashboardMetricCardProps) {
  const trendColor = isPositive ? 'success' : 'error'
  const TrendIcon = isPositive ? TrendingUpRounded : TrendingDownRounded

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Icon sx={{ fontSize: 15, color: 'text.tertiary' }} />
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>

        <Typography variant="h2" sx={{ mb: 1.5, lineHeight: 1 }}>
          {value}
        </Typography>

        <Chip
          size="small"
          color={trendColor}
          icon={<TrendIcon />}
          label={changeLabel}
          sx={CHIP_ICON_SX}
        />
      </CardContent>
    </Card>
  )
}
