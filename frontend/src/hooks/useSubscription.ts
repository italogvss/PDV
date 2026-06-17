import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '../services/subscription.service'
import type { PlanTier } from '../types/subscription.types'
import { useAppDispatch, useAppSelector } from '../store'
import { setSubscription } from '../store/slices/auth.slice'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

export const SUBSCRIPTION_QUERY_KEY = ['subscription'] as const
const PLANS_QUERY_KEY = ['plans'] as const

// Plano efetivo + estado da assinatura da loja atual.
// `refetchIntervalMs` permite que a página de retorno faça polling até o webhook ativar.
export function useSubscription(refetchIntervalMs?: number) {
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => subscriptionService.getMine(),
    refetchInterval: refetchIntervalMs,
  })
}

// Catálogo de planos — muda pouco, cache longo.
export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: () => subscriptionService.getPlans(),
    staleTime: 1000 * 60 * 30,
  })
}

// Espelha o resumo da assinatura (React Query) no auth slice para o banner/exibição global.
// Montado uma vez no DashboardLayout — refaz o dispatch sempre que o status do plano muda
// (inclusive quando o webhook altera no meio da sessão, no próximo refetch).
export function useSyncSubscriptionToStore() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const { data } = useSubscription()

  useEffect(() => {
    if (!isAuthenticated || !data) return
    dispatch(
      setSubscription({
        tier: data.tier,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEndsAt: data.trialEndsAt,
      }),
    )
  }, [dispatch, isAuthenticated, data])
}

export function useStartCheckout() {
  const handleError = useApiError()
  return useMutation({
    mutationFn: (tier: PlanTier) => {
      const base = window.location.origin
      return subscriptionService.startCheckout(
        tier,
        `${base}/configuracoes`,
        `${base}/assinatura/retorno`,
      )
    },
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl
    },
    onError: (error) => handleError(error, 'Erro ao iniciar o checkout.'),
  })
}

// Troca de plano de uma assinatura ativa (upgrade/downgrade). Aplicada no próximo ciclo.
export function useChangePlan() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (tier: PlanTier) => subscriptionService.changePlan(tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast('Mudança de plano agendada para o próximo ciclo.', 'success')
    },
    onError: (error) => handleError(error, 'Erro ao trocar de plano.'),
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: () => subscriptionService.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast('Assinatura cancelada.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar a assinatura.'),
  })
}
