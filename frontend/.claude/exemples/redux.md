# Example — Redux Slice

Redux só para estado global de sessão. O único slice atual é `auth`.

```ts
// store/slices/auth.slice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, UserRole } from '../../types/auth.types'

export interface AuthState {
  userId: string | null
  tenantId: string | null
  role: UserRole | null
  name: string | null
  email: string | null
  avatarUrl: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  userId: null,
  tenantId: null,
  role: null,
  name: null,
  email: null,
  avatarUrl: null,
  isAuthenticated: false,
  isLoading: true,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthUser>) => ({
      ...state,
      ...action.payload,
      isAuthenticated: true,
      isLoading: false,
    }),
    clearAuth: () => ({
      ...initialState,
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
```

## Acessar e atualizar estado

```ts
import { useAppSelector, useAppDispatch } from '../store'
import { setTenant, clearAuth } from '../store/slices/auth.slice'

// Ler
const tenantId = useAppSelector((state) => state.auth.tenantId)
const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

// Atualizar
const dispatch = useAppDispatch()
dispatch(setTenant({ tenantId: 'novo-id' }))
dispatch(clearAuth())
```

Nunca usar `useSelector` ou `useDispatch` direto — sempre `useAppSelector` e `useAppDispatch`.