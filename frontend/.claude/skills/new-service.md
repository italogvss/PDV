# Skill — Novo service + hooks React Query

Use esta skill sempre que precisar conectar uma nova feature à API.

## Checklist

1. Criar tipos em `types/{feature}.types.ts`
2. Criar service em `services/{feature}.service.ts`
3. Criar hooks em `hooks/use{Feature}.ts`

---

## Tipos

```ts
// types/expense.types.ts
export interface Expense {
  id: string
  description: string
  amount: number
  dueDate: Date
  isPaid: boolean
  createdAt: Date
}
```

---

## Service

```ts
// services/expense.service.ts
import { api } from './api'
import type { Expense } from '../types/expense.types'

// Definir BackendExpense apenas se o backend retornar campos diferentes do tipo frontend
interface BackendExpense { id: string; dueDate: string; createdAt: string; ... }

function mapExpense(e: BackendExpense): Expense {
  return { ...e, dueDate: new Date(e.dueDate), createdAt: new Date(e.createdAt) }
}

export interface CreateExpensePayload { description: string; amount: number; dueDate: string }
export interface UpdateExpensePayload { description: string; amount: number; isPaid: boolean }

export const expenseService = {
  // Endpoint paginado → acessar data.data
  getAll: async (): Promise<Expense[]> => {
    const { data } = await api.get('/expenses', { params: { page: 1, pageSize: 500 } })
    return data.data.map(mapExpense)
  },

  // Endpoints de escrita → acessar data direto
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

---

## Hooks

```ts
// hooks/useExpenses.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expenseService, type CreateExpensePayload, type UpdateExpensePayload } from '../services/expense.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['expenses'] as const

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => expenseService.getAll(),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => expenseService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Despesa cadastrada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar despesa.'),
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateExpensePayload) =>
      expenseService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Despesa atualizada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar despesa.'),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Despesa excluída.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir despesa.'),
  })
}
```

## Regras

- `QUERY_KEY` como `const` no topo — nunca string inline no `useQuery`
- Tenant já injetado pelo interceptor do `api.ts` — nunca incluir na query key
- `onSuccess` → sempre `invalidateQueries` + `showToast`
- `onError` → sempre `handleError(error, 'fallback')`
- Nunca chamar `api` diretamente na página — sempre via hook