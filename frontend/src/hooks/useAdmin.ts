import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService, type WebhookFilters } from '../services/admin.service'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

const KEYS = {
  webhooks: (filters: WebhookFilters) => ['admin', 'webhooks', filters] as const,
  subscriptions: ['admin', 'subscriptions'] as const,
  payments: ['admin', 'payments'] as const,
  config: ['admin', 'config'] as const,
}

export function useAdminWebhooks(filters: WebhookFilters = {}) {
  return useQuery({
    queryKey: KEYS.webhooks(filters),
    queryFn: () => adminService.getWebhookEvents(filters),
  })
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: KEYS.subscriptions,
    queryFn: () => adminService.getSubscriptions(),
  })
}

export function useAdminPayments() {
  return useQuery({
    queryKey: KEYS.payments,
    queryFn: () => adminService.getPayments(),
  })
}

export function useAdminConfig() {
  return useQuery({
    queryKey: KEYS.config,
    queryFn: () => adminService.getConfig(),
  })
}

export function useSimulatePix() {
  const showToast = useToast()
  const handleError = useApiError()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pixChargeId: string) => adminService.simulatePix(pixChargeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.payments })
      queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
      showToast('Pagamento PIX simulado com sucesso!', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao simular pagamento PIX.'),
  })
}
