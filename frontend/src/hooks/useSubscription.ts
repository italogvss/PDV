import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '../services/subscription.service'
import { UNLIMITED, type PlanFeature, type PlanLimitKey } from '../constants/entitlements'
import { useAppDispatch, useAppSelector } from '../store'
import { setSubscription } from '../store/slices/auth.slice'
import { useToast } from './useToast'
import { useApiError } from './useApiError'
import { clearStoredPlanSlug } from '../utils/planSelection'
import { entitlementSet } from '../utils/plans'
import type { CancelSubscriptionResult, ChangePlanResult, Subscription } from '../types/subscription.types'

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
  // Comparação case-insensitive: o backend persiste/retorna as chaves em lowercase
  // (contrato HTTP), enquanto as chaves canônicas de FEATURES são camelCase.
  const ownedSet = useMemo(() => entitlementSet(entitlements), [entitlements])
  return {
    has: (feature: PlanFeature) => ownedSet.has(feature.toLowerCase()),
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
  const lastPaymentFailedAt = data?.lastPaymentFailedAt ?? null
  // Assinaturas primitivas para os campos não-escalares (arrays/objetos trocam de referência a
  // cada refetch mesmo sem mudar de conteúdo) — mantêm o dispatch estável.
  const entitlementsKey = (data?.entitlements ?? []).join(',')
  const limitsKey = JSON.stringify(data?.limits ?? {})

  useEffect(() => {
    if (!isAuthenticated || !data) return
    dispatch(setSubscription({
      planId, planName, status: data.status, currentPeriodEnd, trialEndsAt, lastPaymentFailedAt,
      entitlements: data.entitlements ?? [],
      limits: data.limits ?? {},
    }))
    // Dependências primitivas: só refaz o dispatch quando um campo do resumo realmente muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isAuthenticated, planId, planName, status, currentPeriodEnd, trialEndsAt, lastPaymentFailedAt, entitlementsKey, limitsKey])
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

// Troca de plano. Nada é cobrado agora — o valor novo entra na próxima renovação. Um upgrade vale
// na hora; um downgrade fica agendado para a virada do ciclo, preservando o que já foi pago.
export function useChangePlan() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: (planId: string) => subscriptionService.changePlan(planId),
    onSuccess: (result, planId) => {
      // Reescolher o plano vigente desiste do downgrade agendado. Lido ANTES da invalidação, que
      // dispara o refetch e substituiria o estado que distingue os dois casos.
      const current = queryClient.getQueryData<Subscription>(SUBSCRIPTION_QUERY_KEY)
      const keptCurrentPlan = current?.planId === planId

      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast(
        keptCurrentPlan
          ? `Troca cancelada. Você continua no ${result.planName}.`
          : changePlanMessage(result),
        'success',
      )
    },
    onError: (error) => handleError(error, 'Erro ao trocar de plano.'),
  })
}

function changePlanMessage(result: ChangePlanResult): string {
  if (result.scheduled && result.effectiveAt)
    return `Troca agendada. O plano ${result.planName} passa a valer em ${formatDate(result.effectiveAt)}.`

  if (result.nextChargeAt)
    return `Plano alterado para ${result.planName}. O novo valor entra na renovação de ${formatDate(result.nextChargeAt)}.`

  return `Plano alterado para ${result.planName}.`
}

// Cancelar nunca mais desloga: a conta e as lojas continuam de pé durante a retenção, para o dono
// exportar os dados ou reassinar. O que muda é só o direito ao plano — que o /me reflete.
export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const handleError = useApiError()
  return useMutation({
    mutationFn: () => subscriptionService.cancel(),
    onSuccess: (result) => {
      // O slug sobrevive no sessionStorage e, num novo login, `resolvePostLoginPath` mandaria um
      // usuário `hasUsedTrial` direto pro onboarding, pulando o checkout pago.
      clearStoredPlanSlug()
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY })
      showToast(cancelMessage(result), 'info')
    },
    onError: (error) => handleError(error, 'Erro ao cancelar a assinatura.'),
  })
}

function cancelMessage(result: CancelSubscriptionResult): string {
  if (result.refundRequested)
    return 'Reembolso solicitado. Assim que ele for processado você recebe a confirmação por e-mail.'

  if (result.accessUntil)
    return `Assinatura cancelada. Você mantém o acesso até ${formatDate(result.accessUntil)}.`

  return `Assinatura encerrada. Seus dados ficam disponíveis até ${formatDate(result.dataAvailableUntil)}.`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}
