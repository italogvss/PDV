import type { SvgIconComponent } from '@mui/icons-material'

export interface PageKpiCardBadge {
  label: string
  color?: 'default' | 'success' | 'warning' | 'error' | 'info'
  icon?: SvgIconComponent
}

export interface Props {
  icon: SvgIconComponent
  label: string
  value: string | number
  valueColor?: 'warning' | 'error'
  badge?: PageKpiCardBadge
  isLoading?: boolean
}
