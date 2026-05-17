import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UserRole = 'Owner' | 'Employee'

export interface AuthState {
  userId: string | null
  tenantId: string | null
  role: UserRole | null
  name: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  userId: 'mock-user',
  tenantId: 'mock-tenant',
  role: 'Owner',
  name: 'Marcos Almeida',
  isAuthenticated: true,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthState>) => ({ ...state, ...action.payload }),
    clearAuth: () => ({
      userId: null,
      tenantId: null,
      role: null,
      name: null,
      isAuthenticated: false,
    }),
  },
})

export const { setAuth, clearAuth } = authSlice.actions
export default authSlice.reducer
