import { api } from './api'
import type {
  SalesMetrics,
  FinancialSummaryPoint,
  SalesByOperator,
  SalesByPaymentMethod,
  TopProduct,
  ExpensesByCategory,
  GroupBy,
} from '../types/report.types'

interface BackendSalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  cancelledCount: number
  period: string
}

export const reportService = {
  getSalesMetrics: async (startDate: string, endDate: string): Promise<SalesMetrics> => {
    const { data } = await api.get<BackendSalesMetrics>('/reports/sales', {
      params: { startDate, endDate },
    })
    return data
  },

  getFinancialSummary: async (
    startDate: string,
    endDate: string,
    groupBy: GroupBy,
  ): Promise<FinancialSummaryPoint[]> => {
    const { data } = await api.get<FinancialSummaryPoint[]>('/reports/financial-summary', {
      params: { startDate, endDate, groupBy },
    })
    return data
  },

  getSalesByOperator: async (
    startDate: string,
    endDate: string,
  ): Promise<SalesByOperator[]> => {
    const { data } = await api.get<SalesByOperator[]>('/reports/sales/by-operator', {
      params: { startDate, endDate },
    })
    return data
  },

  getSalesByPaymentMethod: async (
    startDate: string,
    endDate: string,
  ): Promise<SalesByPaymentMethod[]> => {
    const { data } = await api.get<SalesByPaymentMethod[]>('/reports/sales/by-payment-method', {
      params: { startDate, endDate },
    })
    return data
  },

  getTopProducts: async (
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopProduct[]> => {
    const { data } = await api.get<TopProduct[]>('/reports/products/top', {
      params: { startDate, endDate, limit },
    })
    return data
  },

  getExpensesByCategory: async (
    startDate: string,
    endDate: string,
  ): Promise<ExpensesByCategory[]> => {
    const { data } = await api.get<ExpensesByCategory[]>('/reports/expenses/by-category', {
      params: { startDate, endDate },
    })
    return data
  },
}
