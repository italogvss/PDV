import type { SvgIconComponent } from '@mui/icons-material'

export type NotificationCategory = 'estoque' | 'financeiro' | 'agendamentos'
export type NotificationSeverity = 'error' | 'warning' | 'info'

export interface NotificationItem {
  id: string
  category: NotificationCategory
  severity: NotificationSeverity
  icon: SvgIconComponent
  title: string
  description: string
  route: string
}

export interface NotificationCounts {
  stock: {
    outOfStock: number
    criticalStock: number
    lowStock: number
    negativeStock: number
  }
  financial: {
    overdueExpenses: number
    upcomingExpenses: number
  }
  appointments: {
    todayAppointments: number
  }
}
