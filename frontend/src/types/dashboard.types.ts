export interface DashboardMetrics {
  billingToday: number
  billingTodayChange: number
  lowStockCount: number
  criticalStockCount: number
  monthlyExpenses: number
  monthlyExpensesChange: number
  estimatedProfit: number
  estimatedProfitChange: number
}

export interface DailyBillingData {
  date: string
  amount: number
}

export interface PaymentMethod {
  id: string
  name: string
  amount: number
  percentage: number
  color: string
}

export interface Sale {
  id: string
  date: string
  time: string
  customer: string
  amount: number
  paymentMethod: string
}

export interface TopProduct {
  id: string
  name: string
  sold: number
  revenue: number
  trend: number
}
