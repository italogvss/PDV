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

// Teto da página carregada de uma vez (mesma convenção das outras listas do app). O `totalCount`
// volta junto porque a lista PRECISA saber quando foi cortada: crediário é dinheiro a receber, e
// uma carteira truncada em silêncio não bate com o KPI "Total a receber", que não tem limite.
// Por isso a busca também é do SERVIDOR — filtrar em memória só acharia quem coubesse no teto.
const PAGE_SIZE = 500

export interface CreditPage<T> {
  rows: T[]
  totalCount: number
  truncated: boolean
}

export const creditService = {
  getAccounts: async (filters: CreditFilters = {}): Promise<CreditPage<CreditAccount>> => {
    const { data } = await api.get<PaginatedResponse<CreditAccount>>('/credit/accounts', {
      params: { page: 1, pageSize: PAGE_SIZE, ...toParams(filters) },
    })
    return { rows: data.data, totalCount: data.totalCount, truncated: data.totalCount > data.data.length }
  },

  getAccount: async (id: string): Promise<CreditAccountDetail> => {
    const { data } = await api.get<CreditAccountDetail>(`/credit/accounts/${id}`)
    return data
  },

  getInstallments: async (filters: CreditFilters = {}): Promise<CreditPage<CreditInstallment>> => {
    const { data } = await api.get<PaginatedResponse<CreditInstallment>>('/credit/installments', {
      params: { page: 1, pageSize: PAGE_SIZE, ...toParams(filters) },
    })
    return { rows: data.data, totalCount: data.totalCount, truncated: data.totalCount > data.data.length }
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
