import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '../services/subscription.service'
import type { BillingPeriod } from '../types/subscription.types'
import { useAppDispatch, useAppSelector } from '../store'
import { setSubscription } from '../store/slices/auth.slice'
import { useToast } from './useToast'
import { useApiError } from './useApiError'

export const SUBSCRIPTION_QUERY_KEY = ['subscription'] as const
const PLANS_QUERY_KEY = ['plans'] as const

// Plano efetivo + estado da assinatura da loja atual.
// `refetchIntervalMs` permite que a página de retorno / o QR PIX façam polling até o webhook ativar.
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
// Só despacha quando algum campo do resumo muda — evita churn a cada refetch/polling (o `data`
// do React Query troca de referência mesmo sem mudança de conteúdo).
export function useSyncSubscriptionToStore() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const { data } = useSubscription()

  const planId = data?.planId ?? null
  const planName = data?.planName ?? null
  const status = data?.status ?? null
  const currentPeriodEnd = data?.currentPeriodEnd ?? null
  const trialEndsAt = data?.trialEndsAt ?? null

  useEffect(() => {
    if (!isAuthenticated || !data) return
    dispatch(setSubscription({ planId, planName, status: data.status, currentPeriodEnd, trialEndsAt }))
    // Dependências primitivas: só refaz o dispatch quando um campo do resumo realmente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isAuthenticated, planId, planName, status, currentPeriodEnd, trialEndsAt])
}

export interface StartCheckoutInput {
  planId: string
  period?: BillingPeriod
  couponCode?: string
}

// Inicia o checkout. Cartão → redireciona para o AbacatePay. PIX → o componente lê
// `mutation.data.pix` para abrir o QR embutido.
export function useStartCheckout() {
  const handleError = useApiError()
  return useMutation({
    mutationFn: (input: StartCheckoutInput) => {
      const base = window.location.origin
      return subscriptionService.startCheckout({
        planId: input.planId,
        method: "Card",
        period: input.period,
        couponCode: input.couponCode,
        returnUrl: `${base}/configuracoes?tab=assinatura`,
        completionUrl: `${base}/assinatura/retorno`,
      })
    },
    onSuccess: (result) => {
      if (result.checkoutUrl) window.location.href = result.checkoutUrl
    },
    onError: (error) => handleError(error, 'Erro ao iniciar o checkout.'),
  })
}

// Troca de plano de uma assinatura ativa (upgrade/downgrade). Aplicada imediatamente.
export function useChangePlan() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (planId: string) => subscriptionService.changePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast('Plano alterado.', 'success')
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
