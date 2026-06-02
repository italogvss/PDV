import type { SvgIconComponent } from '@mui/icons-material'

export interface KpiCardBadge {
  label: string
  color: 'default' | 'success' | 'warning' | 'error'
  icon?: SvgIconComponent
}

export interface KpiCardProps {
  label: string
  icon: SvgIconComponent
  value: string | number
  valueColor?: 'default' | 'warning' | 'error'
  badge: KpiCardBadge
}
