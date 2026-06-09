import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'
import type { TenantListItem } from '../../types/tenant.types'

export interface AuthState {
  userId: string | null
  tenantId: string | null
  role: UserRole | null
  name: string | null
  email: string | null
  phone: string | null
  avatarUrl: string | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean
  tenants: TenantListItem[]
}

const initialState: AuthState = {
  userId: null,
  tenantId: null,
  role: null,
  name: null,
  email: null,
  phone: null,
  avatarUrl: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,
  tenants: [],
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthUser>) => ({
      ...state,
      userId: action.payload.userId,
      tenantId: action.payload.tenantId,
      role: action.payload.role,
      name: action.payload.name,
      email: action.payload.email,
      phone: action.payload.phone,
      avatarUrl: action.payload.avatarUrl,
      isAuthenticated: true,
      isLoading: false,
      mustChangePassword: action.payload.mustChangePassword ?? false,
      tenants: action.payload.tenants ?? [],
    }),
    clearAuth: () => ({
      userId: null,
      tenantId: null,
      role: null,
      name: null,
      email: null,
      phone: null,
      avatarUrl: null,
      isAuthenticated: false,
      isLoading: false,
      mustChangePassword: false,
      tenants: [],
    }),
    setProfile: (state, action: PayloadAction<{ name: string; phone: string | null }>) => ({
      ...state,
      name: action.payload.name,
      phone: action.payload.phone,
    }),
    setLoading: (state, action: PayloadAction<boolean>) => ({
      ...state,
      isLoading: action.payload,
    }),
    setTenant: (state, action: PayloadAction<{ tenantId: string | null }>) => ({
      ...state,
      tenantId: action.payload.tenantId,
    }),
    setMustChangePassword: (state, action: PayloadAction<boolean>) => ({
      ...state,
      mustChangePassword: action.payload,
    }),
  },
})

export const { setAuth, clearAuth, setLoading, setTenant, setMustChangePassword, setProfile } = authSlice.actions
export default authSlice.reducer
