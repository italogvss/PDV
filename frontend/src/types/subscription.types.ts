// Espelha o contrato do backend (PDV.Application/DTOs/Subscriptions). Planos são identificados
// por `id` (Guid) — não há tier hardcoded. Estado Free = `planId == null`. Limites: -1 = ilimitado.
export type SubscriptionStatus =
  | 'None' // sem assinatura (estado Free)
  | 'Pending' // checkout iniciado, aguardando confirmação do gateway
  | 'Trialing'
  | 'Active'
  | 'PastDue'
  | 'Canceled'
  | 'Expired'

export type PaymentMethod = 'Card' | 'Pix'
export type BillingPeriod = 'Monthly' | 'Annual'

export interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  priceAnnual: number | null
  modules: string[]
  limits: Record<string, number>
  supportsCard: boolean
  supportsPix: boolean
  trialDays: number | null
}

export interface Subscription {
  planId: string | null
  planName: string | null
  status: SubscriptionStatus
  method: PaymentMethod | null
  isRenewable: boolean
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  modules: string[]
  limits: Record<string, number>
  // Troca de plano agendada para o próximo ciclo (null = sem mudança pendente).
  pendingPlanId: string | null
  pendingPlanName: string | null
}

// PIX transparente — QR embutido devolvido no checkout (sem redirecionar).
export interface PixCharge {
  chargeId: string
  brCode: string
  brCodeBase64: string
  expiresAt: string | null
}

// Resumo leve guardado no auth slice (espelho do React Query) para banner/exibição global.
export interface SubscriptionSummary {
  planId: string | null
  planName: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEndsAt: string | null
}
