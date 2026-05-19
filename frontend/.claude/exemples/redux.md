# Redux Toolkit — estado de sessão e UI global

Redux gerencia apenas: usuário autenticado, tenantId, tema, sidebar, toasts.

```ts
// store/slices/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  userId: string | null
  tenantId: string | null
  role: 'Owner' | 'Employee' | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  userId: null,
  tenantId: null,
  role: null,
  isAuthenticated: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<AuthState>) => ({ ...state, ...action.payload }),
    clearAuth: () => initialState,
  },
})
```
