import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'

export interface AuthState {
  userId: string | null
  tenantId: string | null
  role: UserRole | null
  name: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  userId: null,
  tenantId: null,
  role: null,
  name: null,
  isAuthenticated: false,
  isLoading: true,
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
      isAuthenticated: true,
      isLoading: false,
    }),
    clearAuth: () => ({
      userId: null,
      tenantId: null,
      role: null,
      name: null,
      isAuthenticated: false,
      isLoading: false,
    }),
    setLoading: (state, action: PayloadAction<boolean>) => ({
      ...state,
      isLoading: action.payload,
    }),
    setTenant: (state, action: PayloadAction<{ tenantId: string }>) => ({
      ...state,
      tenantId: action.payload.tenantId,
    }),
  },
})

export const { setAuth, clearAuth, setLoading, setTenant } = authSlice.actions
export default authSlice.reducer
