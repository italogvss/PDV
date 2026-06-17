import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'
import type { Permission } from '../../types/employee.types'
import type { TenantListItem } from '../../types/tenant.types'
import { TEXT_SIZE_DEFAULT, type AccentColor, type AppTheme } from '../../types/usersettings.type'
import { ALL_MODULES, type OperationModule } from '../../constants/modules'
import type { SubscriptionSummary } from '../../types/subscription.types'

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
  // Módulos da operação ativos do tenant (vindo de /auth/me). Filtra nav e permissões.
  modules: OperationModule[]
  // Aparência aplicada (vinda de /auth/me; alimenta o ThemeModeProvider)
  theme: AppTheme
  accentColor: AccentColor
  textSize: number
  // Resumo de assinatura espelhado do React Query (useSubscription) — NÃO é cache de API.
  // Guarda só o entitlement de sessão (plano/status) para o banner e exibição global lerem
  // de forma síncrona. A fonte de dados continua sendo o React Query.
  subscription: SubscriptionSummary | null
}

// Normaliza o tema do backend ('Light' | 'Dark') para o formato do app.
const themeFromSettings = (settings: AuthUser['settings']): AppTheme =>
  settings?.theme === 'Dark' ? 'dark' : 'light'

const accentFromSettings = (settings: AuthUser['settings']): AccentColor =>
  settings?.accentColor ?? 'green'

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
  modules: ALL_MODULES,
  theme: 'light',
  accentColor: 'green',
  textSize: TEXT_SIZE_DEFAULT,
  subscription: null,
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
      modules: action.payload.modules ?? ALL_MODULES,
      theme: themeFromSettings(action.payload.settings),
      accentColor: accentFromSettings(action.payload.settings),
      textSize: action.payload.settings?.textSize ?? TEXT_SIZE_DEFAULT,
    }),
    clearAuth: (): AuthState => ({ ...initialState, isLoading: false }),
    setAppearance: (state, action: PayloadAction<{ theme: AppTheme; accentColor: AccentColor; textSize: number }>) => ({
      ...state,
      theme: action.payload.theme,
      accentColor: action.payload.accentColor,
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
    setModules: (state, action: PayloadAction<OperationModule[]>) => ({
      ...state,
      modules: action.payload,
    }),
    setSubscription: (state, action: PayloadAction<SubscriptionSummary | null>) => ({
      ...state,
      subscription: action.payload,
    }),
  },
})

export const { setAuth, clearAuth, setLoading, setTenant, setMustChangePassword, setProfile, setAppearance, setModules, setSubscription } = authSlice.actions
export default authSlice.reducer
