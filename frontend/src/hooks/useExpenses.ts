import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '../services/expense.service'
import type { CreateExpensePayload, UpdateExpensePayload } from '../types/expense.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['expenses'] as const
const RECURRING_QUERY_KEY = ['expenses', 'recurring'] as const

export function useExpenses(month?: number, year?: number) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: [...QUERY_KEY, month, year],
    queryFn: () => expenseService.getAll(month, year),
    enabled:
      isModuleEnabled('expenses') &&
      (hasPermission('ViewExpenses') || hasPermission('ManageExpenses')),
  })
}

export function useRecurringExpenses() {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: RECURRING_QUERY_KEY,
    queryFn: () => expenseService.getRecurring(),
    enabled:
      isModuleEnabled('expenses') &&
      (hasPermission('ViewExpenses') || hasPermission('ManageExpenses')),
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

export function useMarkExpensePaid() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => expenseService.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Despesa marcada como paga!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao marcar despesa como paga.'),
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

export function useDeleteExpenseSeries() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: 'future' | 'all' }) =>
      expenseService.deleteWithScope(id, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Despesas excluídas com sucesso.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir despesas da série.'),
  })
}
