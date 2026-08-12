export type RangeUnit = 'day' | 'month'

export interface RangePreset {
  label: string
  key: string
  amount: number
  unit: RangeUnit
}

export type GroupBy = 'day' | 'week' | 'month'

/**
 * Regime contábil dos relatórios. Governa vendas E despesas:
 * - `accrual` (competência): a venda inteira conta na data da venda; despesa, no vencimento.
 * - `cash` (caixa): a venda conta na medida em que o dinheiro entra (entrada do crediário na data
 *   da venda, cada parcela na data da baixa); despesa, na data do pagamento.
 * Sem crediário os dois regimes coincidem — a diferença é o fiado.
 */
export type ReportBasis = 'accrual' | 'cash'

export interface SalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  period: string
  /** Quanto das vendas do período já virou dinheiro. */
  receivedRevenue: number
  /** Saldo de crediário ainda em aberto das vendas do período. */
  outstandingRevenue: number
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
  /** Saldo devedor de crediário — posição de hoje, não do período consultado. */
  outstanding: number
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

/** Seção Crediário dos Relatórios. Mistura fatos do período com a posição de hoje — ver os rótulos. */
export interface CreditReportSummary {
  /** Faturado a prazo no período (parte financiada das vendas fiado). */
  invoiced: number
  /** Recebido no período: entradas das vendas do período + baixas de parcela. */
  received: number
  /** Saldo em aberto hoje. */
  outstanding: number
  /** Parte do saldo em aberto já vencida. */
  overdue: number
  /** Perdas: saldo que ficou de pé nas contas canceladas no período. */
  writtenOff: number
  /** Vencido ÷ a receber, em %. */
  defaultRate: number
  openAccounts: number
  overdueInstallments: number
}

/** Previsão de entrada: o único gráfico do módulo que olha para o futuro (eixo = vencimento). */
export interface ReceivableSchedulePoint {
  label: string
  dueAmount: number
  overdueAmount: number
  installmentCount: number
}
