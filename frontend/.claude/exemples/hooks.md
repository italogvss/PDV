# Example — Hooks React Query

`QUERY_KEY` é simples — o tenant já está no interceptor do Axios, não precisa entrar na key.

```ts
// hooks/useExpenses.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  expenseService,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from '../services/expense.service'
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

## Hook com navegação + dispatch (padrão useCreateTenant)

Usar quando a mutation precisa atualizar Redux e navegar após sucesso:

```ts
export function useCreateExpenseAndRedirect() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => expenseService.create(payload),
    onSuccess: () => {
      dispatch(algumAction())
      showToast('Sucesso!', 'success')
      navigate('/despesas')
    },
    onError: (error) => handleError(error, 'Erro ao criar despesa.'),
  })
}
```