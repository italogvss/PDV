import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '../services/customer.service'
import type { CreateCustomerPayload, UpdateCustomerPayload } from '../types/customers.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['customers'] as const

export function useCustomers(page = 1, pageSize = 50, search?: string) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize, search],
    queryFn: () => customerService.getAll(page, pageSize, search),
    enabled:
      isModuleEnabled('customers') &&
      (hasPermission('ViewCustomers') || hasPermission('ManageCustomers')),
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

const INACTIVE_CUSTOMERS_KEY = ['customers', 'inactive'] as const

export function useInactiveCustomers() {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: INACTIVE_CUSTOMERS_KEY,
    queryFn: () => customerService.getInactive(),
    enabled: isModuleEnabled('customers') && hasPermission('ManageCustomers'),
  })
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => customerService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_CUSTOMERS_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Cliente reativado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar cliente.'),
  })
}

export function useHardDeleteCustomer() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => customerService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_CUSTOMERS_KEY })
      showToast('Cliente excluído definitivamente.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir cliente.'),
  })
}
