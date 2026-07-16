// Encerramento de conta (LGPD). Espelha os DTOs do backend
// (PDV.Application/DTOs/Account/AccountDeletionDtos.cs).

export type AccountDeletionPath = 'DeleteNow' | 'AtPeriodEnd'

export interface AccountDeletionPreview {
  subscriptionStatus: string
  currentPeriodEnd: string | null
  // Pedido dentro dos 7 dias: encerrar emite o estorno integral.
  withinRefundWindow: boolean
  // Estorno de um cancelamento anterior em curso: o pedido é bloqueado.
  refundInProgress: boolean
  // Path B disponível (assinatura paga vigente fora da janela de 7 dias).
  canScheduleAtPeriodEnd: boolean
  graceDays: number
}

export interface AccountDeletionResult {
  effectiveAt: string
  scheduledDeletionAt: string
  subscriptionCanceled: boolean
  refundRequested: boolean
}

export interface AccountDeletionStatus {
  pending: boolean
  requestedAt: string | null
  effectiveAt: string | null
  scheduledDeletionAt: string | null
  // A carência já começou (now >= effectiveAt): a conta está bloqueada para uso.
  blocked: boolean
}
