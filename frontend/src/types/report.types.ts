export interface ReportMetrics {
  totalRevenue: number
  netProfit: number
  costs: number
  averageTicket: number
  revenueChangePercent: number
  profitMarginPercent: number
  costsChangePercent: number
  averageTicketChange: number
}

export interface DailyRevenueData {
  date: string
  revenue: number
  profit: number
}

export interface AccumulatedProfitData {
  date: string
  profit: number
}

export type DateRangeKey = '7d' | '14d' | '30d' | '3m' | '1y'

export interface DateRangeOption {
  label: string
  key: DateRangeKey
}

export interface SalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  cancelledCount: number
  period: string
}
