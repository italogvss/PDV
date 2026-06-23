import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saleService } from '../services/sale.service'
import type { CreateSalePayload } from '../types/sale.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'

const SALES_KEY = ['sales'] as const
const PRODUCTS_KEY = ['products'] as const

export function useSales() {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: SALES_KEY,
    queryFn: () => saleService.getAll(),
    enabled:
      hasActiveSubscription &&
      isModuleEnabled('sales') &&
      (hasPermission('SellProducts') || hasPermission('ViewSalesHistory')),
  })
}

export function useSaleDetail(id: string | null) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: [...SALES_KEY, id],
    queryFn: () => saleService.getById(id!),
    enabled:
      hasActiveSubscription &&
      id !== null &&
      isModuleEnabled('sales') &&
      (hasPermission('SellProducts') || hasPermission('ViewSalesHistory')),
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (payload: CreateSalePayload) => saleService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      showToast('Venda registrada com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao registrar venda.'),
  })
}

export function useCancelSale() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (id: string) => saleService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KEY })
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      showToast('Venda cancelada com sucesso.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar venda.'),
  })
}
