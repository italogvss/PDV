import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantSettingsService } from '../services/tenantSettings.service'
import type { BusinessSettings, OperationSettings, PaymentsSettings } from '../types/settings.types'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const QUERY_KEY = ['tenant-settings'] as const

export function useTenantSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => tenantSettingsService.get(),
  })
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: BusinessSettings) => tenantSettingsService.updateBusiness(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Configurações salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar configurações.'),
  })
}

export function useUpdateOperationSettings() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: OperationSettings) => tenantSettingsService.updateOperation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Configurações salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar configurações.'),
  })
}

export function useUpdatePaymentsSettings() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: PaymentsSettings) => tenantSettingsService.updatePayments(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      showToast('Configurações salvas!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar configurações.'),
  })
}
