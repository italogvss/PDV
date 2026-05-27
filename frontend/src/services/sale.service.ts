import { api } from './api'

export interface CreateSaleItemPayload {
  productId: string
  quantity: number
}

export interface CreateSalePayload {
  customerName?: string
  paymentMethod: string
  isInstallment: boolean
  installmentCount?: number
  amountPaid: number
  items: CreateSaleItemPayload[]
}

export interface SaleListItem {
  id: string
  operatorId: string
  operatorName: string
  customerName: string | null
  paymentMethod: string
  isInstallment: boolean
  installmentCount: number | null
  installmentValue: number | null
  total: number
  status: string
  cancelledById: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface SaleItemDetail {
  id: string
  saleId: string
  productId: string | null
  productName: string
  unitPrice: number
  purchasePriceSnapshot: number | null
  quantity: number
  subtotal: number
}

export interface SaleDetail extends SaleListItem {
  items: SaleItemDetail[]
  amountPaid: number
  change: number
}

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

  getAll: async (): Promise<SaleListItem[]> => {
    const { data } = await api.get<PaginatedSalesResponse>('/sales', {
      params: { page: 1, pageSize: 200 },
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
