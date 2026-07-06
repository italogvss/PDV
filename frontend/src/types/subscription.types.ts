// Espelha o contrato do backend (PDV.Application/DTOs/Subscriptions). Planos são identificados
// por `id` (Guid) — não há tier hardcoded. `planId == null` = sem assinatura viva (acesso
// bloqueado, sem plano grátis). Limites: -1 = ilimitado.
export type SubscriptionStatus =
  | 'None' // sem assinatura viva → acesso bloqueado (não existe mais plano grátis)
  | 'Pending' // checkout iniciado, aguardando confirmação do gateway
  | 'Trialing'
  | 'Active'
  | 'Canceled'
  | 'Expired'

export type PaymentMethod = 'Card'

export interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  // Capabilities inclusas no plano (eixo de billing): módulos + features. Informativo — não esconde UI.
  entitlements: string[]
  limits: Record<string, number>
  trialDays: number | null
  // Ponto de entrada do trial (`?plano=<slug>`) — usado pra iniciar o onboarding já com o plano
  // certo quando o usuário escolhe na tela de planos (sem passar pela landing).
  slug: string
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
  // Capabilities inclusas no plano ativo (eixo de billing): módulos + features. Informativo
  // (upsell) — não esconde UI; o bloqueio acontece via 402. Não confundir com módulos do tenant.
  entitlements: string[]
  limits: Record<string, number>
  // Controle de trial.
  hasUsedTrial: boolean
}

// Resumo leve guardado no auth slice (espelho do React Query) para banner/exibição global e
// gating de plano síncrono (entitlements/limits) — mesmo eixo de permissions/modules.
export interface SubscriptionSummary {
  planId: string | null
  planName: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  // Capabilities inclusas no plano (módulos + features) e limites numéricos (-1 = ilimitado).
  entitlements: string[]
  limits: Record<string, number>
}
