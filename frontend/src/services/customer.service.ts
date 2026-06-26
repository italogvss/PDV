import { api } from './api'
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from '../types/customers.types'

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
    createdAt: c.createdAt,
  }
}

export interface CustomerTopProduct {
  productName: string
  quantity: number
  totalSpent: number
  maxQuantity: number
}

export interface CustomerRecentSale {
  id: string
  shortId: string
  itemsSummary: string
  paymentMethod: string
  total: number
  createdAt: string
}

export interface CustomerAppointmentCounts {
  total: number
  completed: number
  cancelled: number
  inProgress: number
}

export interface CustomerNextAppointment {
  id: string
  start: string
  serviceNames: string[]
  employeeName: string
  status: string
}

export interface CustomerTopService {
  serviceName: string
  count: number
  maxCount: number
}

export interface CustomerCrmStats {
  totalSales: number
  totalSpent: number
  averageTicket: number
  lastPurchaseDate: string | null
  preferredPaymentMethod: string | null
  topProducts: CustomerTopProduct[]
  recentSales: CustomerRecentSale[]
  appointmentCounts: CustomerAppointmentCounts
  nextAppointment: CustomerNextAppointment | null
  topServices: CustomerTopService[]
}

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

  getStats: async (id: string): Promise<CustomerCrmStats> => {
    const { data } = await api.get<CustomerCrmStats>(`/customers/${id}/stats`)
    return data
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

  getInactive: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get<BackendCustomer[]>('/customers/inactive')
    return data.map((c) => ({ id: c.id, name: c.name }))
  },

  restore: async (id: string): Promise<void> => {
    await api.patch(`/customers/${id}/restore`)
  },

  hardDelete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}/permanent`)
  },
}
