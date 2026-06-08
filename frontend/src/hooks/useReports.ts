import { useQuery } from '@tanstack/react-query'
import { reportService } from '../services/report.service'
import type { GroupBy } from '../types/report.types'

const METRICS_KEY = (start: string, end: string) =>
  ['reports', 'sales', start, end] as const
const FINANCIAL_KEY = (start: string, end: string, groupBy: GroupBy) =>
  ['reports', 'financial-summary', start, end, groupBy] as const
const BY_OPERATOR_KEY = (start: string, end: string) =>
  ['reports', 'by-operator', start, end] as const
const BY_PAYMENT_KEY = (start: string, end: string) =>
  ['reports', 'by-payment-method', start, end] as const
const TOP_PRODUCTS_KEY = (start: string, end: string, limit: number) =>
  ['reports', 'top-products', start, end, limit] as const
const BY_CATEGORY_KEY = (start: string, end: string) =>
  ['reports', 'expenses-by-category', start, end] as const

export function useSalesMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: METRICS_KEY(startDate, endDate),
    queryFn: () => reportService.getSalesMetrics(startDate, endDate),
  })
}

export function useFinancialSummary(startDate: string, endDate: string, groupBy: GroupBy) {
  return useQuery({
    queryKey: FINANCIAL_KEY(startDate, endDate, groupBy),
    queryFn: () => reportService.getFinancialSummary(startDate, endDate, groupBy),
  })
}

export function useSalesByOperator(startDate: string, endDate: string) {
  return useQuery({
    queryKey: BY_OPERATOR_KEY(startDate, endDate),
    queryFn: () => reportService.getSalesByOperator(startDate, endDate),
  })
}

export function useSalesByPaymentMethod(startDate: string, endDate: string) {
  return useQuery({
    queryKey: BY_PAYMENT_KEY(startDate, endDate),
    queryFn: () => reportService.getSalesByPaymentMethod(startDate, endDate),
  })
}

export function useTopProducts(startDate: string, endDate: string, limit = 10) {
  return useQuery({
    queryKey: TOP_PRODUCTS_KEY(startDate, endDate, limit),
    queryFn: () => reportService.getTopProducts(startDate, endDate, limit),
  })
}

export function useExpensesByCategory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: BY_CATEGORY_KEY(startDate, endDate),
    queryFn: () => reportService.getExpensesByCategory(startDate, endDate),
  })
}
