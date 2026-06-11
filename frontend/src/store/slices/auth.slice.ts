import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'
import type { Permission } from '../../types/employee.types'
import type { TenantListItem } from '../../types/tenant.types'
import { TEXT_SIZE_DEFAULT, type AppTheme } from '../../types/usersettings.type'

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
  // Aparência aplicada (vinda de /auth/me; alimenta o ThemeModeProvider)
  theme: AppTheme
  textSize: number
}

// Normaliza o tema do backend ('Light' | 'Dark') para o formato do app.
const themeFromSettings = (settings: AuthUser['settings']): AppTheme =>
  settings?.theme === 'Dark' ? 'dark' : 'light'

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
  theme: 'light',
  textSize: TEXT_SIZE_DEFAULT,
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
      theme: themeFromSettings(action.payload.settings),
      textSize: action.payload.settings?.textSize ?? TEXT_SIZE_DEFAULT,
    }),
    clearAuth: (): AuthState => ({ ...initialState, isLoading: false }),
    setAppearance: (state, action: PayloadAction<{ theme: AppTheme; textSize: number }>) => ({
      ...state,
      theme: action.payload.theme,
      textSize: action.payload.textSize,
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

export const { setAuth, clearAuth, setLoading, setTenant, setMustChangePassword, setProfile, setAppearance } = authSlice.actions
export default authSlice.reducer
