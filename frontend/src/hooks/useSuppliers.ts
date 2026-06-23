import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierService } from '../services/supplier.service'
import type { CreateSupplierPayload, UpdateSupplierPayload } from '../types/supplier.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['suppliers'] as const

export function useSuppliers(page = 1, pageSize = 100, search?: string) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: [...QUERY_KEY, page, pageSize, search],
    queryFn: () => supplierService.getAll(page, pageSize, search),
    enabled:
      hasActiveSubscription &&
      isModuleEnabled('suppliers') &&
      (hasPermission('ViewSuppliers') || hasPermission('ManageSuppliers')),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => supplierService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Fornecedor cadastrado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cadastrar fornecedor.'),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierPayload }) =>
      supplierService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Fornecedor atualizado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao atualizar fornecedor.'),
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (id: string) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Fornecedor removido.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao remover fornecedor.'),
  })
}

const INACTIVE_SUPPLIERS_KEY = ['suppliers', 'inactive'] as const

export function useInactiveSuppliers() {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: INACTIVE_SUPPLIERS_KEY,
    queryFn: () => supplierService.getInactive(),
    enabled: hasActiveSubscription && isModuleEnabled('suppliers') && hasPermission('ManageSuppliers'),
  })
}

export function useRestoreSupplier() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => supplierService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_SUPPLIERS_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Fornecedor reativado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao reativar fornecedor.'),
  })
}

export function useHardDeleteSupplier() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => supplierService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INACTIVE_SUPPLIERS_KEY })
      showToast('Fornecedor excluído definitivamente.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao excluir fornecedor.'),
  })
}
