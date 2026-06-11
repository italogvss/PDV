import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'
import type { Permission } from '../../types/employee.types'
import type { TenantListItem } from '../../types/tenant.types'

export interface AuthState {
  userId: string | null
  tenantId: string | null
  role: UserRole | null
  name: string | null
  email: string | null
  phone: string | null
  document: string | null
  birthDate: string | null
  avatarUrl: string | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean
  tenants: TenantListItem[]
  permissions: Permission[]
}

const initialState: AuthState = {
  userId: null,
  tenantId: null,
  role: null,
  name: null,
  email: null,
  phone: null,
  document: null,
  birthDate: null,
  avatarUrl: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,
  tenants: [],
  permissions: [],
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
      document: action.payload.document,
      birthDate: action.payload.birthDate,
      avatarUrl: action.payload.avatarUrl,
      isAuthenticated: true,
      isLoading: false,
      mustChangePassword: action.payload.mustChangePassword ?? false,
      tenants: action.payload.tenants ?? [],
      permissions: action.payload.permissions ?? [],
    }),
    clearAuth: () => ({
      userId: null,
      tenantId: null,
      role: null,
      name: null,
      email: null,
      phone: null,
      document: null,
      birthDate: null,
      avatarUrl: null,
      isAuthenticated: false,
      isLoading: false,
      mustChangePassword: false,
      tenants: [],
      permissions: [],
    }),
    setProfile: (state, action: PayloadAction<{ name: string; phone: string | null; document: string | null; birthDate: string | null }>) => ({
      ...state,
      name: action.payload.name,
      phone: action.payload.phone,
      document: action.payload.document,
      birthDate: action.payload.birthDate,
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
