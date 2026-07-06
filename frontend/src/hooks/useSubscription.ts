import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '../services/subscription.service'
import { authService } from '../services/auth.service'
import { UNLIMITED, type PlanFeature, type PlanLimitKey } from '../constants/entitlements'
import { useAppDispatch, useAppSelector } from '../store'
import { clearAuth, setSubscription } from '../store/slices/auth.slice'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { clearStoredPlanSlug } from '../utils/planSelection'

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

// Gating de plano no frontend (billing). Lê do espelho síncrono no Redux (auth.subscription),
// alimentado por useSyncSubscriptionToStore — mesmo eixo de permissions/modules. `has(feature)`
// para features sem endpoint (cadeado/CTA); `limit(key)` devolve o valor numérico (UNLIMITED = -1).
// Para features COM endpoint, o backend já barra com 402 — não esconda a UI, apenas trate o erro.
export function useEntitlements() {
  const subscription = useAppSelector((s) => s.auth.subscription)
  const entitlements = subscription?.entitlements ?? []
  const limits = subscription?.limits ?? {}
  return {
    has: (feature: PlanFeature) => entitlements.includes(feature),
    limit: (key: PlanLimitKey) => (key in limits ? limits[key] : UNLIMITED),
    isLoaded: subscription !== null,
  }
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
  // Assinaturas primitivas para os campos não-escalares (arrays/objetos trocam de referência a
  // cada refetch mesmo sem mudar de conteúdo) — mantêm o dispatch estável.
  const entitlementsKey = (data?.entitlements ?? []).join(',')
  const limitsKey = JSON.stringify(data?.limits ?? {})

  useEffect(() => {
    if (!isAuthenticated || !data) return
    dispatch(setSubscription({
      planId, planName, status: data.status, currentPeriodEnd, trialEndsAt,
      entitlements: data.entitlements ?? [],
      limits: data.limits ?? {},
    }))
    // Dependências primitivas: só refaz o dispatch quando um campo do resumo realmente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isAuthenticated, planId, planName, status, currentPeriodEnd, trialEndsAt, entitlementsKey, limitsKey])
}

export interface StartCheckoutInput {
  planId: string
  couponCode?: string
  // Pra onde o gateway volta se o usuário cancelar/abandonar o pagamento. Default: aba de
  // assinatura em Configurações. A tela de planos pós-login (sem tenant) passa a própria rota
  // (`/planos`) — voltar pra Configurações não faz sentido pra quem ainda não tem negócio.
  returnUrl?: string
}

// Inicia o checkout da assinatura recorrente no cartão → redireciona para o AbacatePay.
export function useStartCheckout() {
  const handleError = useApiError()
  return useMutation({
    mutationFn: (input: StartCheckoutInput) => {
      const base = window.location.origin
      return subscriptionService.startCheckout({
        planId: input.planId,
        couponCode: input.couponCode,
        returnUrl: input.returnUrl ?? `${base}/configuracoes?tab=assinatura`,
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
  const dispatch = useAppDispatch()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: () => subscriptionService.cancel(),
    onSuccess: async (result) => {
      // Cancelamento em trial: o acesso e a(s) loja(s) já caíram no backend. Encerra a sessão
      // (invalida o refresh token) e manda para a landing — não há mais app para voltar.
      if (result.accessRevoked) {
        try {
          await authService.logout()
        } catch {
          // logout best-effort — segue para a landing de qualquer forma.
        }
        dispatch(clearAuth())
        queryClient.clear()
        // Sem esse clear, o slug sobrevive no sessionStorage e, num novo login, `resolvePostLoginPath`
        // mandaria um usuário `hasUsedTrial` direto pro onboarding, pulando o checkout pago.
        clearStoredPlanSlug()
        window.location.href = import.meta.env.VITE_LANDING_URL
        return
      }

      // Assinatura ativa cancelada: mantém acesso até o fim do período. Só atualiza o banner.
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast('Assinatura cancelada. Você mantém o acesso até o fim do período.', 'info')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar a assinatura.'),
  })
}
