import { api } from './api'
import type {
  BillingPeriod,
  PaymentMethod,
  Plan,
  PixCharge,
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
  modules: string[]
  limits: Record<string, number>
  hasUsedTrial: boolean
}

interface BackendPlan {
  id: string
  name: string
  description: string | null
  Price: number
  modules: string[]
  limits: Record<string, number>
  supportsCard: boolean
  supportsPix: boolean
  trialDays: number | null
}

interface BackendCheckout {
  checkoutUrl: string | null
  pix: PixCharge | null
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
    modules: s.modules ?? [],
    limits: s.limits ?? {},
    hasUsedTrial: s.hasUsedTrial ?? false,
  }
}

function mapPlan(p: BackendPlan): Plan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    Price: p.Price,
    modules: p.modules ?? [],
    limits: p.limits ?? {},
    supportsCard: p.supportsCard,
    supportsPix: p.supportsPix,
    trialDays: p.trialDays ?? null,
  }
}

export interface StartCheckoutPayload {
  planId: string
  method: PaymentMethod
  period?: BillingPeriod
  couponCode?: string
  returnUrl: string
  completionUrl: string
}

// Cartão → checkoutUrl preenchido (redirect). PIX → pix preenchido (QR embutido).
export interface CheckoutResult {
  checkoutUrl: string | null
  pix: PixCharge | null
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

  // Inicia o checkout do plano pago. O backend devolve a URL do AbacatePay (cartão) ou o PIX.
  startCheckout: async (payload: StartCheckoutPayload): Promise<CheckoutResult> => {
    const { data } = await api.post<BackendCheckout>('/subscriptions/checkout', {
      planId: payload.planId,
      method: payload.method === 'Pix' ? 'PIX' : 'CARD',
      period: payload.period ?? null,
      couponCode: payload.couponCode ?? null,
      returnUrl: payload.returnUrl,
      completionUrl: payload.completionUrl,
    })
    return { checkoutUrl: data.checkoutUrl ?? null, pix: data.pix ?? null }
  },

  // Troca de plano de uma assinatura ativa — aplicada imediatamente.
  changePlan: async (planId: string): Promise<void> => {
    await api.post('/subscriptions/change-plan', { planId })
  },

  cancel: async (): Promise<void> => {
    await api.post('/subscriptions/cancel')
  },
}
