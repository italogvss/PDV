import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantSettingsService } from '../services/tenantSettings.service'
import type { BusinessSettings, OperationSettings, PaymentsSettings } from '../types/settings.types'
import type { OperationModule } from '../constants/modules'
import { useAppDispatch } from '../store'
import { setModules } from '../store/slices/auth.slice'
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

export function useUpdateModulesSettings() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const showToast = useToast()
  const handleError = useApiError()

  return useMutation({
    mutationFn: (payload: OperationModule[]) => tenantSettingsService.updateModules(payload),
    onSuccess: (modules) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      // Reflete na hora o menu lateral e a matriz de permissões (que leem do auth slice).
      dispatch(setModules(modules))
      showToast('Módulos atualizados!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao salvar módulos.'),
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
