import { useQuery } from '@tanstack/react-query'
import { reportService } from '../services/report.service'
import type { DateRangeKey } from '../types/report.types'

const QUERY_KEY = (key: DateRangeKey) => ['reports', 'sales', key] as const

export function useSalesMetrics(dateRangeKey: DateRangeKey) {
  return useQuery({
    queryKey: QUERY_KEY(dateRangeKey),
    queryFn: () => reportService.getSalesMetrics(dateRangeKey),
  })
}
