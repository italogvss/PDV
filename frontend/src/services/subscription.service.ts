import { api } from './api'
import type {
  Plan,
  PlanTier,
  Subscription,
  SubscriptionStatus,
} from '../types/subscription.types'

// Tipos do backend (PDV.Application/DTOs/Subscriptions/SubscriptionDtos.cs).
interface BackendSubscription {
  tier: string
  status: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  modules: string[]
  limits: Record<string, number>
  pendingTier: string | null
  pendingPlanName: string | null
}

interface BackendPlan {
  tier: string
  name: string
  description: string | null
  priceMonthly: number
  modules: string[]
  limits: Record<string, number>
}

function mapSubscription(s: BackendSubscription): Subscription {
  return {
    tier: s.tier as PlanTier,
    status: s.status as SubscriptionStatus,
    trialEndsAt: s.trialEndsAt ?? null,
    currentPeriodEnd: s.currentPeriodEnd ?? null,
    canceledAt: s.canceledAt ?? null,
    modules: s.modules ?? [],
    limits: s.limits ?? {},
    pendingTier: (s.pendingTier as PlanTier | null) ?? null,
    pendingPlanName: s.pendingPlanName ?? null,
  }
}

function mapPlan(p: BackendPlan): Plan {
  return {
    tier: p.tier as PlanTier,
    name: p.name,
    description: p.description ?? null,
    priceMonthly: p.priceMonthly,
    modules: p.modules ?? [],
    limits: p.limits ?? {},
  }
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

  // Inicia o checkout do plano pago e devolve a URL do AbacatePay.
  startCheckout: async (tier: PlanTier, returnUrl: string, completionUrl: string): Promise<string> => {
    const { data } = await api.post<{ checkoutUrl: string }>('/subscriptions/checkout', {
      plan: tier,
      returnUrl,
      completionUrl,
    })
    return data.checkoutUrl
  },

  // Troca de plano de uma assinatura ativa — aplicada no próximo ciclo de cobrança.
  changePlan: async (tier: PlanTier): Promise<void> => {
    await api.post('/subscriptions/change-plan', { plan: tier })
  },

  cancel: async (): Promise<void> => {
    await api.post('/subscriptions/cancel')
  },
}
