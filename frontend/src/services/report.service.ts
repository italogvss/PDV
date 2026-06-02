import { api } from './api'
import type { SalesMetrics, DateRangeKey } from '../types/report.types'

interface BackendSalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  cancelledCount: number
  period: string
}

function getDateRange(key: DateRangeKey): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()

  switch (key) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '14d':
      start.setDate(start.getDate() - 14)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '3m':
      start.setMonth(start.getMonth() - 3)
      break
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      break
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

export const reportService = {
  getSalesMetrics: async (key: DateRangeKey): Promise<SalesMetrics> => {
    const params = getDateRange(key)
    const { data } = await api.get<BackendSalesMetrics>('/reports/sales', { params })
    return data
  },
}
