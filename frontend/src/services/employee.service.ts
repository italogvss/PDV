import { api } from './api'
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '../types/employee.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendEmployee {
  id: string
  userId: string | null
  name: string
  email: string
  roleId: string
  roleName: string
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
  salary?: number | null
  paymentDay?: number | null
  autoCreateSalaryExpense: boolean
}

function mapEmployee(e: BackendEmployee): Employee {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    email: e.email,
    roleId: e.roleId,
    roleName: e.roleName,
    phone: e.phone ?? undefined,
    avatarUrl: e.avatarUrl ?? undefined,
    isActive: e.isActive,
    createdAt: e.createdAt,
    salary: e.salary ?? undefined,
    paymentDay: e.paymentDay ?? undefined,
    autoCreateSalaryExpense: e.autoCreateSalaryExpense,
  }
}

export const employeeService = {
  getAll: async (page = 1, pageSize = 50): Promise<{ data: Employee[]; totalCount: number }> => {
    const { data } = await api.get<PaginatedResponse<BackendEmployee>>('/employees', {
      params: { page, pageSize },
    })
    return { data: data.data.map(mapEmployee), totalCount: data.totalCount }
  },

  getById: async (id: string): Promise<Employee> => {
    const { data } = await api.get<BackendEmployee>(`/employees/${id}`)
    return mapEmployee(data)
  },

  create: async (payload: CreateEmployeePayload): Promise<Employee> => {
    const { data } = await api.post<BackendEmployee>('/employees', payload)
    return mapEmployee(data)
  },

  update: async (id: string, payload: UpdateEmployeePayload): Promise<Employee> => {
    const { data } = await api.put<BackendEmployee>(`/employees/${id}`, payload)
    return mapEmployee(data)
  },

  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`)
  },

  reactivate: async (id: string): Promise<void> => {
    await api.patch(`/employees/${id}/reactivate`)
  },

  getInactive: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get<BackendEmployee[]>('/employees/inactive')
    return data.map((e) => ({ id: e.id, name: e.name }))
  },

  hardDelete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}/permanent`)
  },
}
