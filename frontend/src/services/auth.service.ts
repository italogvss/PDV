import { api } from './api'
import type { AuthUser, UserRole } from '../types/auth.types'
import type { Permission } from '../types/employee.types'
import type { Theme } from '../types/usersettings.type'

interface MeApiResponse {
  id: string
  name: string
  email: string
  phone: string | null
  document: string | null
  birthDate: string | null
  avatarUrl: string | null
  lastTenantId: string | null
  role: UserRole
  settings: { theme: Theme; textSize: number } | null
  tenants: Array<{ tenantId: string; name: string; role: 'Owner' | 'Employee' }>
  mustChangePassword?: boolean
  permissions?: string[]
}

export const authService = {
  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get<MeApiResponse>('/auth/me')
    return {
      userId: data.id,
      tenantId: data.lastTenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      birthDate: data.birthDate,
      avatarUrl: data.avatarUrl,
      role: data.role ?? 'Owner',
      settings: data.settings
        ? { theme: data.settings.theme, textSize: data.settings.textSize ?? 15 }
        : null,
      tenants: data.tenants ?? [],
      mustChangePassword: data.mustChangePassword ?? false,
      permissions: (data.permissions ?? []) as Permission[],
    }
  },

  loginWithGoogle: async (credential: string): Promise<void> => {
    await api.post('/auth/google', { credential })
  },

  loginWithLocal: async (email: string, password: string): Promise<void> => {
    await api.post('/auth/local', { email, password })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  switchTenant: async (tenantId: string): Promise<void> => {
    await api.post(`/auth/switch-tenant/${tenantId}`)
  },
}
