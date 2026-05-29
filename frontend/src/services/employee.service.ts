import { api } from './api'
import type { Employee, EmployeePermissions, EmployeeType, Permission } from '../types/employee.types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendEmployee {
  id: string
  userId: string
  name: string
  email: string
  employeeType: string
  position: string
  salary?: number | null
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
}

function mapEmployee(e: BackendEmployee): Employee {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    email: e.email,
    employeeType: e.employeeType as EmployeeType,
    position: e.position,
    salary: e.salary ?? undefined,
    phone: e.phone ?? undefined,
    avatarPath: e.avatarUrl ?? undefined,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }
}

export interface CreateEmployeePayload {
  name: string
  email: string
  temporaryPassword: string
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}

export interface UpdateEmployeePayload {
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}

export const employeeService = {
  getAll: async (page = 1, pageSize = 20): Promise<{ data: Employee[]; totalCount: number }> => {
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

  getPermissions: async (employeeType: EmployeeType): Promise<EmployeePermissions> => {
    const { data } = await api.get<EmployeePermissions>(`/employees/permissions/${employeeType}`)
    return data
  },

  setPermissions: async (
    employeeType: EmployeeType,
    permissions: Permission[],
  ): Promise<EmployeePermissions> => {
    const { data } = await api.put<EmployeePermissions>('/employees/permissions', {
      employeeType,
      permissions,
    })
    return data
  },
}
