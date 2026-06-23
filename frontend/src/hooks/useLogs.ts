import { useQuery } from '@tanstack/react-query'
import { logsService } from '../services/logs.service'
import { useUserPermissions } from './useUserPermissions'

const KEYS = {
  appointmentStatus: (from: string, to: string) =>
    ['logs', 'appointment-status', from, to] as const,
  stockMovements: (from: string, to: string) =>
    ['logs', 'stock-movements', from, to] as const,
  priceHistory: (from: string, to: string) =>
    ['logs', 'price-history', from, to] as const,
}

export function useAppointmentStatusLogs(from: string, to: string, enabled = true) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: KEYS.appointmentStatus(from, to),
    queryFn: () => logsService.getAppointmentStatusLogs(from, to),
    enabled: hasActiveSubscription && enabled && isModuleEnabled('logs') && hasPermission('ViewLogs'),
  })
}

export function useStockMovements(from: string, to: string, enabled = true) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: KEYS.stockMovements(from, to),
    queryFn: () => logsService.getStockMovements(from, to),
    enabled: hasActiveSubscription && enabled && isModuleEnabled('logs') && hasPermission('ViewLogs'),
  })
}

export function usePriceHistory(from: string, to: string, enabled = true) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: KEYS.priceHistory(from, to),
    queryFn: () => logsService.getPriceHistory(from, to),
    enabled: hasActiveSubscription && enabled && isModuleEnabled('logs') && hasPermission('ViewLogs'),
  })
}
