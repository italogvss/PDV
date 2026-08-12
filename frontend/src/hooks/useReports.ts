import { useQuery } from '@tanstack/react-query'
import { reportService } from '../services/report.service'
import { FEATURES } from '../constants/entitlements'
import type { GroupBy, ReportBasis } from '../types/report.types'
import { useEntitlements } from './useSubscription'
import { useUserPermissions } from './useUserPermissions'

// Todo endpoint deste service vive atrás de [RequireEntitlement(AdvancedReports)] no backend —
// o gate por entitlement fica aqui (e não em cada página) para que nenhum hook dispare a
// requisição sem a feature, não importa de onde seja chamado.
function useReportsEnabled(): boolean {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  const { has } = useEntitlements()
  return isModuleEnabled('reports') && hasPermission('ViewReports') && has(FEATURES.advancedReports)
}

const METRICS_KEY = (start: string, end: string) =>
  ['reports', 'sales', start, end] as const
const FINANCIAL_KEY = (start: string, end: string, groupBy: GroupBy, basis: ReportBasis) =>
  ['reports', 'financial-summary', start, end, groupBy, basis] as const
const EMPLOYEES_LIST_KEY = ['reports', 'employees-list'] as const
const CUSTOMERS_LIST_KEY = ['reports', 'customers-list'] as const
const BY_OPERATOR_KEY = (start: string, end: string) =>
  ['reports', 'by-operator', start, end] as const
const BY_PAYMENT_KEY = (start: string, end: string, basis: ReportBasis) =>
  ['reports', 'by-payment-method', start, end, basis] as const
const TOP_PRODUCTS_KEY = (start: string, end: string, limit: number) =>
  ['reports', 'top-products', start, end, limit] as const
const TOP_CUSTOMERS_KEY = (start: string, end: string, limit: number) =>
  ['reports', 'top-customers', start, end, limit] as const
const BY_CATEGORY_KEY = (start: string, end: string) =>
  ['reports', 'expenses-by-category', start, end] as const
const REVENUE_BY_TYPE_KEY = (start: string, end: string) =>
  ['reports', 'revenue-by-type', start, end] as const
const APPOINTMENT_SUMMARY_KEY = (start: string, end: string, groupBy: GroupBy) =>
  ['reports', 'appointment-summary', start, end, groupBy] as const
const TOP_SERVICES_KEY = (start: string, end: string, limit: number) =>
  ['reports', 'top-services', start, end, limit] as const
const BY_EMPLOYEE_KEY = (start: string, end: string) =>
  ['reports', 'appointments-by-employee', start, end] as const
const SERVICE_CATEGORY_REVENUE_KEY = (start: string, end: string) =>
  ['reports', 'service-category-revenue', start, end] as const
const PEAK_HOURS_KEY = (start: string, end: string) =>
  ['reports', 'appointment-peak-hours', start, end] as const
const CREDIT_SUMMARY_KEY = (start: string, end: string) =>
  ['reports', 'credit-summary', start, end] as const
const CREDIT_AGING_KEY = ['reports', 'credit-aging'] as const
const RECEIVABLE_SCHEDULE_KEY = (start: string, end: string, groupBy: GroupBy) =>
  ['reports', 'receivable-schedule', start, end, groupBy] as const

export function useSalesMetrics(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: METRICS_KEY(startDate, endDate),
    queryFn: () => reportService.getSalesMetrics(startDate, endDate),
    enabled,
  })
}

export function useFinancialSummary(
  startDate: string,
  endDate: string,
  groupBy: GroupBy,
  basis: ReportBasis = 'accrual',
) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: FINANCIAL_KEY(startDate, endDate, groupBy, basis),
    queryFn: () => reportService.getFinancialSummary(startDate, endDate, groupBy, basis),
    enabled,
  })
}

export function useReportEmployees() {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: EMPLOYEES_LIST_KEY,
    queryFn: () => reportService.getEmployeesList(),
    enabled,
  })
}

export function useReportCustomers() {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: CUSTOMERS_LIST_KEY,
    queryFn: () => reportService.getCustomersList(),
    enabled,
  })
}

export function useSalesByOperator(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: BY_OPERATOR_KEY(startDate, endDate),
    queryFn: () => reportService.getSalesByOperator(startDate, endDate),
    enabled,
  })
}

export function useSalesByPaymentMethod(
  startDate: string,
  endDate: string,
  basis: ReportBasis = 'accrual',
) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: BY_PAYMENT_KEY(startDate, endDate, basis),
    queryFn: () => reportService.getSalesByPaymentMethod(startDate, endDate, basis),
    enabled,
  })
}

export function useTopProducts(startDate: string, endDate: string, limit = 10) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: TOP_PRODUCTS_KEY(startDate, endDate, limit),
    queryFn: () => reportService.getTopProducts(startDate, endDate, limit),
    enabled,
  })
}

export function useTopCustomers(startDate: string, endDate: string, limit = 10) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: TOP_CUSTOMERS_KEY(startDate, endDate, limit),
    queryFn: () => reportService.getTopCustomers(startDate, endDate, limit),
    enabled,
  })
}

export function useExpensesByCategory(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: BY_CATEGORY_KEY(startDate, endDate),
    queryFn: () => reportService.getExpensesByCategory(startDate, endDate),
    enabled,
  })
}

export function useRevenueByType(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: REVENUE_BY_TYPE_KEY(startDate, endDate),
    queryFn: () => reportService.getRevenueByType(startDate, endDate),
    enabled,
  })
}

export function useAppointmentSummary(startDate: string, endDate: string, groupBy: GroupBy) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: APPOINTMENT_SUMMARY_KEY(startDate, endDate, groupBy),
    queryFn: () => reportService.getAppointmentSummary(startDate, endDate, groupBy),
    enabled,
  })
}

export function useTopServices(startDate: string, endDate: string, limit = 10) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: TOP_SERVICES_KEY(startDate, endDate, limit),
    queryFn: () => reportService.getTopServices(startDate, endDate, limit),
    enabled,
  })
}

export function useAppointmentsByEmployee(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: BY_EMPLOYEE_KEY(startDate, endDate),
    queryFn: () => reportService.getAppointmentsByEmployee(startDate, endDate),
    enabled,
  })
}

export function useServiceCategoryRevenue(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: SERVICE_CATEGORY_REVENUE_KEY(startDate, endDate),
    queryFn: () => reportService.getServiceCategoryRevenue(startDate, endDate),
    enabled,
  })
}

export function useAppointmentPeakHours(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: PEAK_HOURS_KEY(startDate, endDate),
    queryFn: () => reportService.getAppointmentPeakHours(startDate, endDate),
    enabled,
  })
}

// Crediário na página de Relatórios. Vem de /reports/credit/* (gate de Relatórios), não de
// /credit/* — a seção não pode depender do módulo Crediário estar liberado para o usuário.
export function useCreditReportSummary(startDate: string, endDate: string) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: CREDIT_SUMMARY_KEY(startDate, endDate),
    queryFn: () => reportService.getCreditSummary(startDate, endDate),
    enabled,
  })
}

export function useCreditReportAging() {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: CREDIT_AGING_KEY,
    queryFn: () => reportService.getCreditAging(),
    enabled,
  })
}

export function useReceivableSchedule(startDate: string, endDate: string, groupBy: GroupBy) {
  const enabled = useReportsEnabled()
  return useQuery({
    queryKey: RECEIVABLE_SCHEDULE_KEY(startDate, endDate, groupBy),
    queryFn: () => reportService.getReceivableSchedule(startDate, endDate, groupBy),
    enabled,
  })
}
