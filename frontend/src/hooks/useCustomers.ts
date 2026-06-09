import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '../services/customer.service'
import type { CreateCustomerPayload, UpdateCustomerPayload } from '../types/customers.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['customers'] as const

export function useCustomers(page = 1, pageSize = 50, search?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize, search],
    queryFn: () => customerService.getAll(page, pageSize, search),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Cliente cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar cliente.'),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      customerService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Cliente atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar cliente.'),
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Cliente removido.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover cliente.'),
  })
}
