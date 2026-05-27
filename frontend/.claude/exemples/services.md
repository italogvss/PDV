# Example — Service

O `api` já injeta `X-Tenant-Id` via interceptor — nunca passar manualmente nos services.
A autenticação é via cookie HttpOnly — nunca usar localStorage ou header Authorization.

```ts
// services/expense.service.ts
import { api } from './api'
import type { Expense } from '../types/expense.types'

// Tipo do backend quando difere do tipo frontend
interface BackendExpense {
  id: string
  description: string
  amount: number
  dueDate: string       // string no backend, Date no frontend
  isPaid: boolean
  isRecurring: boolean
  createdAt: string
}

// Mapeamento centralizado aqui — nunca no hook ou componente
function mapExpense(e: BackendExpense): Expense {
  return {
    id: e.id,
    description: e.description,
    amount: e.amount,
    dueDate: new Date(e.dueDate),
    isPaid: e.isPaid,
    isRecurring: e.isRecurring,
    createdAt: new Date(e.createdAt),
  }
}

export interface CreateExpensePayload {
  description: string
  amount: number
  dueDate: string
  isRecurring?: boolean
}

export interface UpdateExpensePayload {
  description: string
  amount: number
  dueDate: string
  isPaid: boolean
}

export const expenseService = {
  getAll: async (): Promise<Expense[]> => {
    const { data } = await api.get('/expenses', {
      params: { page: 1, pageSize: 500 },
    })
    return data.data.map(mapExpense)   // backend retorna PaginatedResponse
  },

  getById: async (id: string): Promise<Expense> => {
    const { data } = await api.get<BackendExpense>(`/expenses/${id}`)
    return mapExpense(data)            // backend retorna objeto direto
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    const { data } = await api.post<BackendExpense>('/expenses', payload)
    return mapExpense(data)
  },

  update: async (id: string, payload: UpdateExpensePayload): Promise<Expense> => {
    const { data } = await api.put<BackendExpense>(`/expenses/${id}`, payload)
    return mapExpense(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`)
  },
}
```

**Quando usar `data.data`:** apenas em endpoints paginados que retornam `PaginatedResponse<T>`.
**Quando usar `data` direto:** em endpoints que retornam o objeto/array diretamente (create, update, getById).