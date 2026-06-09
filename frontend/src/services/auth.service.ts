import { api } from './api'
import type { AuthUser, UserRole } from '../types/auth.types'
import type { Theme } from '../types/usersettings.type'

interface MeApiResponse {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  lastTenantId: string | null
  role: UserRole
  settings: { theme: Theme } | null
  tenants: Array<{ tenantId: string; name: string; role: 'Owner' | 'Employee' }>
  mustChangePassword?: boolean
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
      avatarUrl: data.avatarUrl,
      role: data.role ?? 'Owner',
      settings: data.settings ? { theme: data.settings.theme } : null,
      tenants: data.tenants ?? [],
      mustChangePassword: data.mustChangePassword ?? false,
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
