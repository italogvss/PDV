export interface MonthPreset {
  label: string
  key: string
  months: number
}

export interface DateRangeParams {
  startDate: string
  endDate: string
}

export type GroupBy = 'day' | 'week' | 'month'

export interface SalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  cancelledCount: number
  period: string
}

export interface FinancialSummaryPoint {
  label: string
  revenue: number
  cost: number
  expenses: number
  grossProfit: number
  netResult: number
}

export interface SalesByOperator {
  operatorId: string
  operatorName: string
  totalSales: number
  totalRevenue: number
}

export interface SalesByPaymentMethod {
  paymentMethod: string
  total: number
  count: number
}

export interface TopProduct {
  productName: string
  quantity: number
  revenue: number
}

export interface ExpensesByCategory {
  category: string
  total: number
  count: number
}
