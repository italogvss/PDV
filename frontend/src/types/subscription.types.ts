// Espelha o contrato do backend (PDV.Application/DTOs/Subscriptions). Planos são identificados
// por `id` (Guid) — não há tier hardcoded. `planId == null` = sem assinatura viva (acesso
// bloqueado, sem plano grátis). Limites: -1 = ilimitado.
export type SubscriptionStatus =
  | 'None' // sem assinatura viva → acesso bloqueado (não existe mais plano grátis)
  | 'Pending' // checkout iniciado, aguardando confirmação do gateway
  | 'Trialing'
  | 'Active'
  | 'RefundRequested' // cancelada na janela de arrependimento; estorno em análise
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
  // Prazo final para cancelar com reembolso. null quando a assinatura nunca foi paga (trial).
  refundEligibleUntil: string | null
  // Troca de plano agendada: entra em vigor em pendingPlanStartsAt (virada do ciclo). Até lá valem
  // planId/entitlements atuais e nada é cobrado.
  pendingPlanId: string | null
  pendingPlanName: string | null
  pendingPlanStartsAt: string | null
  // Cobrança de renovação recusada e ainda em retentativa. null = nenhuma falha pendente.
  lastPaymentFailedAt: string | null
  paymentRetryNumber: number | null
  // Capabilities inclusas no plano ativo (eixo de billing): módulos + features. Informativo
  // (upsell) — não esconde UI; o bloqueio acontece via 402. Não confundir com módulos do tenant.
  entitlements: string[]
  limits: Record<string, number>
  // Controle de trial.
  hasUsedTrial: boolean
}

// Resultado da troca de plano. Nunca há cobrança no ato — o valor novo entra na próxima renovação.
// `scheduled` = downgrade: o plano novo só passa a valer em `effectiveAt` (a virada do ciclo).
// Num upgrade `effectiveAt` é agora; no trial é null (e `nextChargeAt` também, ainda não há cobrança).
export interface ChangePlanResult {
  planName: string
  scheduled: boolean
  effectiveAt: string | null
  nextChargeAt: string | null
}

// Resultado do cancelamento — o toast e a navegação pós-cancelamento derivam daqui.
export interface CancelSubscriptionResult {
  status: 'Expired' | 'RefundRequested' | 'Canceled'
  refundRequested: boolean
  // Até quando o plano continua valendo; null = o acesso caiu agora.
  accessUntil: string | null
  // Prazo para exportar os dados ou reassinar antes da exclusão definitiva.
  dataAvailableUntil: string
}

// Resumo leve guardado no auth slice (espelho do React Query) para banner/exibição global e
// gating de plano síncrono (entitlements/limits) — mesmo eixo de permissions/modules.
export interface SubscriptionSummary {
  planId: string | null
  planName: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  // Cobrança de renovação recusada — dispara o aviso global de pagamento (uma vez por sessão).
  lastPaymentFailedAt: string | null
  // Capabilities inclusas no plano (módulos + features) e limites numéricos (-1 = ilimitado).
  entitlements: string[]
  limits: Record<string, number>
}
