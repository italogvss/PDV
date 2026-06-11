import { api } from './api'

// Tipo do backend (UserResponse)
interface BackendUser {
  id: string
  name: string
  email: string
  phone?: string | null
  document?: string | null
  birthDate?: string | null
  avatarUrl?: string | null
  createdAt: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  document?: string
  birthDate?: string
  avatarPath?: string
  createdAt: string
}

function mapUser(u: BackendUser): UserProfile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    document: u.document ?? undefined,
    birthDate: u.birthDate ?? undefined,
    avatarPath: u.avatarUrl ?? undefined,
    createdAt: u.createdAt,
  }
}

export interface UpdateUserPayload {
  name: string
  phone?: string | null
  document?: string | null
  birthDate?: string | null
}

export const userService = {
  update: async (id: string, payload: UpdateUserPayload): Promise<UserProfile> => {
    const { data } = await api.put<BackendUser>(`/users/${id}`, payload)
    return mapUser(data)
  },
}
