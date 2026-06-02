import { api } from './api'
import type { Customer } from '../types/customers.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendAddress {
  street: string | null
  number: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

interface BackendCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  note: string
  address: BackendAddress | null
  createdAt: string
}

function mapCustomer(c: BackendCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    document: c.document,
    note: c.note,
    address: c.address,
  }
}

export interface CreateCustomerPayload {
  name: string
  phone: string | null
  email: string | null
  document: string | null
  note: string
  address: {
    street: string | null
    number: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  } | null
}

export type UpdateCustomerPayload = CreateCustomerPayload

export const customerService = {
  getAll: async (
    page = 1,
    pageSize = 50,
    search?: string,
  ): Promise<{ data: Customer[]; totalCount: number }> => {
    const { data } = await api.get<PaginatedResponse<BackendCustomer>>('/customers', {
      params: { page, pageSize, search: search || undefined },
    })
    return { data: data.data.map(mapCustomer), totalCount: data.totalCount }
  },

  getById: async (id: string): Promise<Customer> => {
    const { data } = await api.get<BackendCustomer>(`/customers/${id}`)
    return mapCustomer(data)
  },

  create: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await api.post<BackendCustomer>('/customers', payload)
    return mapCustomer(data)
  },

  update: async (id: string, payload: UpdateCustomerPayload): Promise<Customer> => {
    const { data } = await api.put<BackendCustomer>(`/customers/${id}`, payload)
    return mapCustomer(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`)
  },
}
