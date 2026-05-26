import { api } from './api'
import type { AuthUser, UserRole } from '../types/auth.types'
import type { Theme } from '../types/usersettings.type'

interface MeApiResponse {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  lastTenantId: string | null
  role: UserRole
  settings: { theme: Theme } | null
  tenants: Array<{ tenantId: string; name: string; role: 'Owner' | 'Employee' }>
}

export const authService = {
  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get<MeApiResponse>('/auth/me')
    console.log('Me API response:', data) // Log da resposta da API para depuração
    return {
      userId: data.id,
      tenantId: data.lastTenantId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      role: data.role ?? 'Owner',
      settings: data.settings ? { theme: data.settings.theme } : null,
      tenants: data.tenants ?? [],
    }
  },

  loginWithGoogle: async (credential: string): Promise<void> => {
    await api.post('/auth/google', { credential })
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
}
