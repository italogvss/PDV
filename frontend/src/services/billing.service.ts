import { api } from './api'
import type { UserPayment, UserPaymentPage } from '../types/billing.types'

interface BackendPayment {
  id: string
  kind: string
  method: string
  amountCents: number
  status: string
  paidAt: string | null
  receiptUrl: string | null
  cardLastFour: string | null
  cardBrand: string | null
  periodStart: string | null
  periodEnd: string | null
  retryNumber: number | null
  createdAt: string
}

interface BackendPaymentPage {
  data: BackendPayment[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

function mapPayment(p: BackendPayment): UserPayment {
  return {
    id: p.id,
    kind: p.kind as UserPayment['kind'],
    method: p.method as UserPayment['method'],
    amountCents: p.amountCents,
    status: p.status as UserPayment['status'],
    paidAt: p.paidAt,
    receiptUrl: p.receiptUrl,
    cardLastFour: p.cardLastFour,
    cardBrand: p.cardBrand,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    retryNumber: p.retryNumber ?? null,
    createdAt: p.createdAt,
  }
}

export const billingService = {
  getPaymentHistory: async (page = 1, pageSize = 50): Promise<UserPaymentPage> => {
    const { data } = await api.get<BackendPaymentPage>('/payments/history', {
      params: { page, pageSize },
    })
    return {
      data: data.data.map(mapPayment),
      page: data.page,
      pageSize: data.pageSize,
      totalCount: data.totalCount,
      totalPages: data.totalPages,
    }
  },
}
