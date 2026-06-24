// Espelha o contrato do backend (PDV.Application/DTOs/Subscriptions). Planos são identificados
// por `id` (Guid) — não há tier hardcoded. Estado Free = `planId == null`. Limites: -1 = ilimitado.
export type SubscriptionStatus =
  | 'None' // sem assinatura (estado Free)
  | 'Pending' // checkout iniciado, aguardando confirmação do gateway
  | 'Trialing'
  | 'Active'
  | 'Canceled'
  | 'Expired'

export type PaymentMethod = 'Card' | 'Pix'
export type BillingPeriod = 'Monthly' | 'Annual'

export interface Plan {
  id: string
  name: string
  description: string | null
  Price: number
  // Módulos incluídos no plano (eixo de billing). Informativo — não esconde UI.
  entitledModules: string[]
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
  // Módulos incluídos no plano ativo (eixo de billing). Informativo (futuro upsell) — não
  // esconde UI; o bloqueio acontece via 402. Não confundir com os módulos do tenant (auth).
  entitledModules: string[]
  limits: Record<string, number>
  // Controle de trial.
  hasUsedTrial: boolean
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
