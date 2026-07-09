import { api } from './api'
import type {
  SalesMetrics,
  FinancialSummaryPoint,
  SalesByOperator,
  SalesByPaymentMethod,
  TopProduct,
  TopCustomer,
  ExpensesByCategory,
  RevenueByType,
  GroupBy,
  ExpenseBasis,
  AppointmentSummaryPoint,
  TopService,
  AppointmentsByEmployee,
  ServiceCategoryRevenue,
  AppointmentPeakHour,
  ReportEmployee,
  ReportCustomer,
} from '../types/report.types'

interface BackendSalesMetrics {
  totalSales: number
  totalRevenue: number
  averageTicket: number
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
    expenseBasis: ExpenseBasis = 'accrual',
  ): Promise<FinancialSummaryPoint[]> => {
    const { data } = await api.get<FinancialSummaryPoint[]>('/reports/financial-summary', {
      params: { startDate, endDate, groupBy, expenseBasis },
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

  getTopCustomers: async (
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopCustomer[]> => {
    const { data } = await api.get<TopCustomer[]>('/reports/customers/top', {
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

  getRevenueByType: async (startDate: string, endDate: string): Promise<RevenueByType> => {
    const { data } = await api.get<RevenueByType>('/reports/revenue-by-type', {
      params: { startDate, endDate },
    })
    return data
  },

  getAppointmentSummary: async (
    startDate: string,
    endDate: string,
    groupBy: GroupBy,
  ): Promise<AppointmentSummaryPoint[]> => {
    const { data } = await api.get<AppointmentSummaryPoint[]>('/reports/appointments/summary', {
      params: { startDate, endDate, groupBy },
    })
    return data
  },

  getTopServices: async (
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopService[]> => {
    const { data } = await api.get<TopService[]>('/reports/appointments/top-services', {
      params: { startDate, endDate, limit },
    })
    return data
  },

  getAppointmentsByEmployee: async (
    startDate: string,
    endDate: string,
  ): Promise<AppointmentsByEmployee[]> => {
    const { data } = await api.get<AppointmentsByEmployee[]>('/reports/appointments/by-employee', {
      params: { startDate, endDate },
    })
    return data
  },

  getServiceCategoryRevenue: async (
    startDate: string,
    endDate: string,
  ): Promise<ServiceCategoryRevenue[]> => {
    const { data } = await api.get<ServiceCategoryRevenue[]>('/reports/appointments/by-category', {
      params: { startDate, endDate },
    })
    return data
  },

  getAppointmentPeakHours: async (
    startDate: string,
    endDate: string,
  ): Promise<AppointmentPeakHour[]> => {
    const { data } = await api.get<AppointmentPeakHour[]>('/reports/appointments/peak-hours', {
      params: { startDate, endDate },
    })
    return data
  },

  getEmployeesList: async (): Promise<ReportEmployee[]> => {
    const { data } = await api.get<ReportEmployee[]>('/reports/employees')
    return data
  },

  getCustomersList: async (): Promise<ReportCustomer[]> => {
    const { data } = await api.get<ReportCustomer[]>('/reports/customers')
    return data
  },

  exportCsv: async (category: string): Promise<void> => {
    const endpointMap: Record<string, { url: string; filename: string }> = {
      sales:     { url: '/reports/sales/export/all',  filename: 'vendas.csv'       },
      products:  { url: '/reports/stock/export',       filename: 'produtos.csv'     },
      customers: { url: '/reports/customers/export',   filename: 'clientes.csv'     },
      services:  { url: '/reports/services/export',    filename: 'servicos.csv'     },
      expenses:  { url: '/reports/expenses/export',    filename: 'despesas.csv'     },
      billing:   { url: '/reports/billing/export',     filename: 'faturamento.csv'  },
      team:      { url: '/reports/team/export',        filename: 'equipe.csv'       },
    }

    const target = endpointMap[category]
    if (!target) return

    const { data } = await api.get<string>(target.url, { responseType: 'blob' })
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = target.filename
    link.click()
    URL.revokeObjectURL(url)
  },

  exportCsvForTenant: async (tenantId: string, category: string): Promise<void> => {
    const filenames: Record<string, string> = {
      sales:     'vendas.csv',
      products:  'produtos.csv',
      customers: 'clientes.csv',
      services:  'servicos.csv',
      expenses:  'despesas.csv',
      billing:   'faturamento.csv',
      team:      'equipe.csv',
    }

    const { data } = await api.get<string>(`/tenants/${tenantId}/export/${category}`, { responseType: 'blob' })
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filenames[category] ?? `${category}.csv`
    link.click()
    URL.revokeObjectURL(url)
  },
}
