import { api } from './api'
import type { AuthUser } from '../types/auth.types'

interface MeApiResponse {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  lastTenantId: string | null
}

export const authService = {
  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get<MeApiResponse>('/auth/me')
    return {
      userId: data.id,
      tenantId: data.lastTenantId,
      name: data.name,
      // role não vem do /auth/me ainda — padrão Owner
      role: 'Owner',
    }
  },

  loginWithGoogle: async (credential: string): Promise<void> => {
    await api.post('/auth/google', { credential })
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
}
