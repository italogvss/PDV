// Espelha o contrato do backend (PDV.Application/DTOs/Subscriptions). Tier e Status são
// os mesmos enums serializados como string. Limites: -1 = ilimitado.
export type PlanTier = 'Free' | 'Starter' | 'Pro'

export type SubscriptionStatus =
  | 'Trialing'
  | 'Active'
  | 'PastDue'
  | 'Canceled'
  | 'Expired'

export interface Plan {
  tier: PlanTier
  name: string
  description: string | null
  priceMonthly: number
  modules: string[]
  limits: Record<string, number>
}

export interface Subscription {
  tier: PlanTier
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  modules: string[]
  limits: Record<string, number>
  // Troca de plano agendada para o próximo ciclo (null = sem mudança pendente).
  pendingTier: PlanTier | null
  pendingPlanName: string | null
}

// Resumo leve guardado no auth slice (espelho do React Query) para banner/exibição global.
export interface SubscriptionSummary {
  tier: PlanTier
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEndsAt: string | null
}
