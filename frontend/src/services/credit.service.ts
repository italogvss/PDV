import { api } from './api'
import type {
  CreateCreditAccountPayload,
  CreditAccount,
  CreditAccountDetail,
  CreditAging,
  CreditFilters,
  CreditInstallment,
  CreditPayment,
  CreditReminder,
  CreditSummary,
  ReceiveInstallmentPayload,
} from '../types/credit.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

// O backend já devolve o shape final (camelCase, derivados calculados no service) — não há
// remapeamento a fazer aqui, só a tipagem e o desembrulho da paginação.
function toParams(filters: CreditFilters) {
  return {
    customerId: filters.customerId,
    status: filters.status,
    overdue: filters.overdue,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
    search: filters.search,
  }
}

export const creditService = {
  getAccounts: async (filters: CreditFilters = {}): Promise<CreditAccount[]> => {
    const { data } = await api.get<PaginatedResponse<CreditAccount>>('/credit/accounts', {
      params: { page: 1, pageSize: 200, ...toParams(filters) },
    })
    return data.data
  },

  getAccount: async (id: string): Promise<CreditAccountDetail> => {
    const { data } = await api.get<CreditAccountDetail>(`/credit/accounts/${id}`)
    return data
  },

  getInstallments: async (filters: CreditFilters = {}): Promise<CreditInstallment[]> => {
    const { data } = await api.get<PaginatedResponse<CreditInstallment>>('/credit/installments', {
      params: { page: 1, pageSize: 200, ...toParams(filters) },
    })
    return data.data
  },

  getSummary: async (): Promise<CreditSummary> => {
    const { data } = await api.get<CreditSummary>('/credit/summary')
    return data
  },

  getAging: async (): Promise<CreditAging> => {
    const { data } = await api.get<CreditAging>('/credit/aging')
    return data
  },

  getReminder: async (installmentId: string): Promise<CreditReminder> => {
    const { data } = await api.get<CreditReminder>(`/credit/installments/${installmentId}/reminder`)
    return data
  },

  createAccount: async (payload: CreateCreditAccountPayload): Promise<CreditAccountDetail> => {
    const { data } = await api.post<CreditAccountDetail>('/credit/accounts', payload)
    return data
  },

  receive: async (
    installmentId: string,
    payload: ReceiveInstallmentPayload,
  ): Promise<CreditPayment> => {
    const { data } = await api.post<CreditPayment>(
      `/credit/installments/${installmentId}/receive`,
      payload,
    )
    return data
  },

  reverse: async (paymentId: string): Promise<void> => {
    await api.delete(`/credit/payments/${paymentId}`)
  },

  cancelAccount: async (id: string): Promise<CreditAccount> => {
    const { data } = await api.patch<CreditAccount>(`/credit/accounts/${id}/cancel`)
    return data
  },
}
