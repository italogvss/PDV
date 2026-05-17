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

export interface DateRangeOption {
  label: string
  days: number
}
