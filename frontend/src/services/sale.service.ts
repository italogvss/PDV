import { api } from './api'
import type {
  CreateSalePayload,
  SaleListItem,
  SaleDetail,
} from '../types/sale.types'

interface PaginatedSalesResponse {
  data: SaleListItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export const saleService = {
  create: async (payload: CreateSalePayload): Promise<SaleDetail> => {
    const { data } = await api.post<SaleDetail>('/sales', payload)
    return data
  },

  getAll: async (startDate?: string, endDate?: string): Promise<SaleListItem[]> => {
    const { data } = await api.get<PaginatedSalesResponse>('/sales', {
      params: { page: 1, pageSize: 200, startDate, endDate },
    })
    return data.data
  },

  getById: async (id: string): Promise<SaleDetail> => {
    const { data } = await api.get<SaleDetail>(`/sales/${id}`)
    return data
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/sales/${id}`)
  },
}
