import { api } from './api'
import type { TenantRole } from '../types/employee.types'

interface BackendTenantRole {
  id: string
  name: string
  description?: string | null
  color?: string | null
  isDefault: boolean
  memberCount: number
  permissions: string[]
}

function mapRole(r: BackendTenantRole): TenantRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color ?? undefined,
    isDefault: r.isDefault,
    memberCount: r.memberCount,
    permissions: r.permissions,
  }
}

export interface CreateRolePayload {
  name: string
  description?: string
  color?: string
}

export interface UpdateRolePayload {
  name: string
  description?: string
  color?: string
}

export const teamRolesService = {
  getAll: async (): Promise<TenantRole[]> => {
    const { data } = await api.get<BackendTenantRole[]>('/team-roles')
    return data.map(mapRole)
  },

  getById: async (id: string): Promise<TenantRole> => {
    const { data } = await api.get<BackendTenantRole>(`/team-roles/${id}`)
    return mapRole(data)
  },

  create: async (payload: CreateRolePayload): Promise<TenantRole> => {
    const { data } = await api.post<BackendTenantRole>('/team-roles', payload)
    return mapRole(data)
  },

  update: async (id: string, payload: UpdateRolePayload): Promise<TenantRole> => {
    const { data } = await api.put<BackendTenantRole>(`/team-roles/${id}`, payload)
    return mapRole(data)
  },

  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/team-roles/${id}`)
  },

  setPermissions: async (id: string, permissions: string[]): Promise<string[]> => {
    const { data } = await api.put<string[]>(`/team-roles/${id}/permissions`, { permissions })
    return data
  },

  getInactive: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get<BackendTenantRole[]>('/team-roles/inactive')
    return data.map((r) => ({ id: r.id, name: r.name }))
  },

  restore: async (id: string): Promise<void> => {
    await api.patch(`/team-roles/${id}/restore`)
  },

  hardDelete: async (id: string): Promise<void> => {
    await api.delete(`/team-roles/${id}/permanent`)
  },
}
