import { api } from './api'
import type {
  CancelSubscriptionResult,
  ChangePlanResult,
  PaymentMethod,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '../types/subscription.types'

// Tipos do backend (PDV.Application/DTOs/Subscriptions/SubscriptionDtos.cs).
interface BackendSubscription {
  planId: string | null
  planName: string | null
  status: string
  method: string | null
  isRenewable: boolean
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  refundEligibleUntil: string | null
  pendingPlanId: string | null
  pendingPlanName: string | null
  pendingPlanStartsAt: string | null
  lastPaymentFailedAt: string | null
  paymentRetryNumber: number | null
  entitlements: string[]
  limits: Record<string, number>
  hasUsedTrial: boolean
}

interface BackendPlan {
  id: string
  name: string
  description: string | null
  // Backend serializa em camelCase (PlanResponse.Price → "price"), em reais (PriceCents / 100).
  price: number
  entitlements: string[]
  limits: Record<string, number>
  slug: string
}

interface BackendCheckout {
  checkoutUrl: string | null
}

interface BackendCancelResult {
  status: string
  refundRequested: boolean
  accessUntil: string | null
  dataAvailableUntil: string
}

function mapSubscription(s: BackendSubscription): Subscription {
  return {
    planId: s.planId ?? null,
    planName: s.planName ?? null,
    status: s.status as SubscriptionStatus,
    method: (s.method as PaymentMethod | null) ?? null,
    isRenewable: s.isRenewable ?? false,
    trialEndsAt: s.trialEndsAt ?? null,
    currentPeriodEnd: s.currentPeriodEnd ?? null,
    canceledAt: s.canceledAt ?? null,
    refundEligibleUntil: s.refundEligibleUntil ?? null,
    pendingPlanId: s.pendingPlanId ?? null,
    pendingPlanName: s.pendingPlanName ?? null,
    pendingPlanStartsAt: s.pendingPlanStartsAt ?? null,
    lastPaymentFailedAt: s.lastPaymentFailedAt ?? null,
    paymentRetryNumber: s.paymentRetryNumber ?? null,
    entitlements: s.entitlements ?? [],
    limits: s.limits ?? {},
    hasUsedTrial: s.hasUsedTrial ?? false,
  }
}

function mapPlan(p: BackendPlan): Plan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: p.price,
    entitlements: p.entitlements ?? [],
    limits: p.limits ?? {},
    slug: p.slug,
  }
}

export interface StartCheckoutPayload {
  planId: string
  couponCode?: string
  returnUrl: string
  completionUrl: string
}

// Assinatura recorrente por cartão → checkoutUrl preenchido (redirect ao gateway).
export interface CheckoutResult {
  checkoutUrl: string | null
}

export const subscriptionService = {
  getMine: async (): Promise<Subscription> => {
    const { data } = await api.get<BackendSubscription>('/subscriptions/me')
    return mapSubscription(data)
  },

  getPlans: async (): Promise<Plan[]> => {
    const { data } = await api.get<BackendPlan[]>('/subscriptions/plans')
    return data.map(mapPlan)
  },

  // Inicia o checkout do plano pago. O backend devolve a URL do AbacatePay (cartão).
  startCheckout: async (payload: StartCheckoutPayload): Promise<CheckoutResult> => {
    const { data } = await api.post<BackendCheckout>('/subscriptions/checkout', {
      planId: payload.planId,
      couponCode: payload.couponCode ?? null,
      returnUrl: payload.returnUrl,
      completionUrl: payload.completionUrl,
    })
    return { checkoutUrl: data.checkoutUrl ?? null }
  },

  // Troca de plano de uma assinatura ativa. Nada é cobrado agora: o valor novo entra na próxima
  // renovação. Upgrade vale na hora; downgrade fica agendado para a virada do ciclo (`scheduled`).
  changePlan: async (planId: string): Promise<ChangePlanResult> => {
    const { data } = await api.post<ChangePlanResult>('/subscriptions/change-plan', { planId })
    return {
      planName: data.planName,
      scheduled: data.scheduled ?? false,
      effectiveAt: data.effectiveAt ?? null,
      nextChargeAt: data.nextChargeAt ?? null,
    }
  },

  cancel: async (): Promise<CancelSubscriptionResult> => {
    const { data } = await api.post<BackendCancelResult>('/subscriptions/cancel')
    return {
      status: data.status as CancelSubscriptionResult['status'],
      refundRequested: data.refundRequested ?? false,
      accessUntil: data.accessUntil ?? null,
      dataAvailableUntil: data.dataAvailableUntil,
    }
  },
}
