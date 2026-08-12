import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saleService } from '../services/sale.service'
import type { CreateSalePayload } from '../types/sale.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { useUserPermissions } from './useUserPermissions'
import { invalidateNotifications } from './useNotifications'

const SALES_KEY = ['sales'] as const
const PRODUCTS_KEY = ['products'] as const
// Uma venda pode abrir (venda fiado) ou cancelar o crediário dela no backend.
const CREDIT_KEY = ['credit'] as const

export function useSales(startDate?: string, endDate?: string) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: [...SALES_KEY, startDate, endDate],
    queryFn: () => saleService.getAll(startDate, endDate),
    enabled:
      isModuleEnabled('sales') &&
      (hasPermission('SellProducts') || hasPermission('ViewSalesHistory')),
  })
}

export function useSaleDetail(id: string | null) {
  const { hasPermission, isModuleEnabled } = useUserPermissions()
  return useQuery({
    queryKey: [...SALES_KEY, id],
    queryFn: () => saleService.getById(id!),
    enabled:
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
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: SALES_KEY })
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
      // Venda fiado abre uma conta de crediário na mesma transação.
      if (sale.credit) queryClient.invalidateQueries({ queryKey: CREDIT_KEY })
      invalidateNotifications(queryClient)
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
      queryClient.invalidateQueries({ queryKey: CREDIT_KEY })
      invalidateNotifications(queryClient)
      showToast('Venda cancelada com sucesso.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar venda.'),
  })
}
