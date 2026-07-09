export type RangeUnit = 'day' | 'month'

export interface RangePreset {
  label: string
  key: string
  amount: number
  unit: RangeUnit
}

export type GroupBy = 'day' | 'week' | 'month'

// Regime das despesas nos relatórios: competência (por vencimento) × caixa (por pagamento).
export type ExpenseBasis = 'accrual' | 'cash'

export interface SalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  period: string
}

export interface FinancialSummaryPoint {
  label: string
  revenue: number
  cost: number
  fees: number
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

export interface TopCustomer {
  customerId: string
  name: string
  purchaseCount: number
  totalRevenue: number
}

export interface ExpensesByCategory {
  category: string
  total: number
  count: number
}

export interface RevenueByType {
  servicesRevenue: number
  productsRevenue: number
}

export interface AppointmentSummaryPoint {
  label: string
  total: number
  completed: number
  cancelled: number
  inProgress: number
  pending: number
  revenueRealized: number
  revenueTotal: number
}

export interface TopService {
  serviceId: string
  serviceName: string
  count: number
  revenue: number
}

export interface AppointmentsByEmployee {
  employeeId: string
  employeeName: string
  count: number
  revenue: number
}

export interface ServiceCategoryRevenue {
  category: string
  total: number
  color: string | null
}

export interface AppointmentPeakHour {
  hour: number
  count: number
}

export interface ReportEmployee {
  id: string
  name: string
  roleName: string | null
  salary: number | null
  avatarUrl: string | null
}

export interface ReportCustomer {
  id: string
  name: string
}
