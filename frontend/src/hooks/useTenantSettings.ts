import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OperationModule } from '../constants/modules'
import { tenantSettingsService } from '../services/tenantSettings.service'
import { useAppDispatch } from '../store'
import { setModules } from '../store/slices/auth.slice'
import type { BusinessSettings, OperationSettings, PaymentsSettings } from '../types/settings.types'
import { useApiError } from './useApiError'
import { useToast } from './useToast'
import { useUserPermissions } from './useUserPermissions'

const QUERY_KEY = ['tenant-settings'] as const

export function useTenantSettings() {
  const { isOwner } = useUserPermissions()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => tenantSettingsService.get(),
    enabled: isOwner,
  })
}

// Configurações consumidas pelo PDV (regras de pagamento/desconto/cliente). Diferente de
// useTenantSettings (owner-only): busca para qualquer usuário que possa vender, pois o caixa
// precisa das regras reais da loja. GET /tenants/settings é aberto a qualquer autenticado.
export function usePdvSettings() {
  const { hasPermission } = useUserPermissions()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => tenantSettingsService.get(),
    enabled: hasPermission('SellProducts'),
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
    onError: (error) => handleError(error, 'Erro ao salvar configurações de pagamento.'),
  })
}

// Configurações de operação (ex.: controle de estoque) consumidas por modais de cadastro.
// Aceita `enabled` para só buscar quando o modal abre — evita GET /tenant-settings desnecessário
// para Employees, já que os modais ficam sempre montados na página.
export function useInventorySettings(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => tenantSettingsService.get(),
    select: (data) => data.operation,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
