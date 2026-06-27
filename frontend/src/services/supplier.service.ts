import { api } from './api'
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types/supplier.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendSupplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
  createdAt: string
  updatedAt?: string | null
}

function mapSupplier(s: BackendSupplier): Supplier {
  const hasAddress = s.addressStreet || s.addressNumber || s.addressCity || s.addressState || s.addressZipCode
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    document: s.document,
    address: hasAddress
      ? {
          street: s.addressStreet,
          number: s.addressNumber,
          city: s.addressCity,
          state: s.addressState,
          zipCode: s.addressZipCode,
        }
      : null,
    createdAt: s.createdAt,
  }
}

export const supplierService = {
  getAll: async (
    page = 1,
    pageSize = 100,
    search?: string,
  ): Promise<{ data: Supplier[]; totalCount: number }> => {
    const { data } = await api.get<PaginatedResponse<BackendSupplier>>('/suppliers', {
      params: { page, pageSize, search: search || undefined },
    })
    return { data: data.data.map(mapSupplier), totalCount: data.totalCount }
  },

  getById: async (id: string): Promise<Supplier> => {
    const { data } = await api.get<BackendSupplier>(`/suppliers/${id}`)
    return mapSupplier(data)
  },

  create: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const { data } = await api.post<BackendSupplier>('/suppliers', payload)
    return mapSupplier(data)
  },

  update: async (id: string, payload: UpdateSupplierPayload): Promise<Supplier> => {
    const { data } = await api.put<BackendSupplier>(`/suppliers/${id}`, payload)
    return mapSupplier(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`)
  },

  getInactive: async (): Promise<{ id: string; name: string; updatedAt?: string }[]> => {
    const { data } = await api.get<BackendSupplier[]>('/suppliers/inactive')
    return data.map((s) => ({ id: s.id, name: s.name, updatedAt: s.updatedAt ?? undefined }))
  },

  restore: async (id: string): Promise<void> => {
    await api.patch(`/suppliers/${id}/restore`)
  },

  hardDelete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}/permanent`)
  },
}
