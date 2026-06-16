import { useQuery } from '@tanstack/react-query'
import {
  AccountBalanceWalletOutlined,
  CalendarTodayOutlined,
  ErrorOutlined,
  RemoveShoppingCartOutlined,
  ScheduleOutlined,
  TrendingDownOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material'
import { notificationService } from '../services/notification.service'
import type { NotificationCounts, NotificationItem } from '../types/notification.types'

const QUERY_KEY = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationService.get(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function buildNotificationItems(counts: NotificationCounts): NotificationItem[] {
  const items: NotificationItem[] = []
  const { stock, financial, appointments } = counts

  if (stock.outOfStock > 0) {
    const n = stock.outOfStock
    items.push({
      id: 'out-of-stock',
      category: 'estoque',
      severity: 'error',
      icon: RemoveShoppingCartOutlined,
      title: 'Produtos sem estoque',
      description: `${n} ${n === 1 ? 'produto' : 'produtos'} sem estoque`,
      route: '/estoque',
    })
  }

  if (stock.criticalStock > 0) {
    const n = stock.criticalStock
    items.push({
      id: 'critical-stock',
      category: 'estoque',
      severity: 'error',
      icon: ErrorOutlined,
      title: 'Estoque crítico',
      description: `${n} ${n === 1 ? 'produto' : 'produtos'} em nível crítico`,
      route: '/estoque',
    })
  }

  if (stock.lowStock > 0) {
    const n = stock.lowStock
    items.push({
      id: 'low-stock',
      category: 'estoque',
      severity: 'warning',
      icon: WarningAmberOutlined,
      title: 'Estoque baixo',
      description: `${n} ${n === 1 ? 'produto' : 'produtos'} com estoque baixo`,
      route: '/estoque',
    })
  }

  if (stock.negativeStock > 0) {
    const n = stock.negativeStock
    items.push({
      id: 'negative-stock',
      category: 'estoque',
      severity: 'error',
      icon: TrendingDownOutlined,
      title: 'Estoque negativo',
      description: `${n} ${n === 1 ? 'produto' : 'produtos'} com estoque negativo`,
      route: '/estoque',
    })
  }

  if (financial.overdueExpenses > 0) {
    const n = financial.overdueExpenses
    items.push({
      id: 'overdue-expenses',
      category: 'financeiro',
      severity: 'error',
      icon: AccountBalanceWalletOutlined,
      title: 'Despesas vencidas',
      description: `${n} ${n === 1 ? 'despesa vencida' : 'despesas vencidas'}`,
      route: '/despesas',
    })
  }

  if (financial.upcomingExpenses > 0) {
    const n = financial.upcomingExpenses
    items.push({
      id: 'upcoming-expenses',
      category: 'financeiro',
      severity: 'warning',
      icon: ScheduleOutlined,
      title: 'Despesas a vencer',
      description: `${n} ${n === 1 ? 'despesa vence' : 'despesas vencem'} nos próximos 7 dias`,
      route: '/despesas',
    })
  }

  if (appointments.todayAppointments > 0) {
    const n = appointments.todayAppointments
    items.push({
      id: 'today-appointments',
      category: 'agendamentos',
      severity: 'info',
      icon: CalendarTodayOutlined,
      title: 'Agendamentos hoje',
      description: `${n} ${n === 1 ? 'agendamento' : 'agendamentos'} para hoje`,
      route: '/agendamentos',
    })
  }

  return items
}
