import { useQuery } from '@tanstack/react-query'
import { logsService } from '../services/logs.service'

const KEYS = {
  appointmentStatus: (from: string, to: string) =>
    ['logs', 'appointment-status', from, to] as const,
  stockMovements: (from: string, to: string) =>
    ['logs', 'stock-movements', from, to] as const,
  priceHistory: (from: string, to: string) =>
    ['logs', 'price-history', from, to] as const,
}

export function useAppointmentStatusLogs(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.appointmentStatus(from, to),
    queryFn: () => logsService.getAppointmentStatusLogs(from, to),
    enabled,
  })
}

export function useStockMovements(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.stockMovements(from, to),
    queryFn: () => logsService.getStockMovements(from, to),
    enabled,
  })
}

export function usePriceHistory(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.priceHistory(from, to),
    queryFn: () => logsService.getPriceHistory(from, to),
    enabled,
  })
}
