import type { ChipProps } from '@mui/material'

export type ChipColor = ChipProps['color']
export interface StatusMeta {
  label: string
  color: ChipColor
}

// Rótulos + cores dos status de billing (valores vêm dos enums do backend, em PascalCase).

export const SUBSCRIPTION_STATUS: Record<string, StatusMeta> = {
  Active: { label: 'Ativa', color: 'success' },
  Trialing: { label: 'Trial', color: 'info' },
  Pending: { label: 'Pendente', color: 'warning' },
  RefundRequested: { label: 'Reembolso', color: 'warning' },
  Canceled: { label: 'Cancelada', color: 'default' },
  Expired: { label: 'Expirada', color: 'error' },
}

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  Paid: { label: 'Pago', color: 'success' },
  Pending: { label: 'Pendente', color: 'warning' },
  Failed: { label: 'Falhou', color: 'error' },
  Refunded: { label: 'Estornado', color: 'default' },
  Disputed: { label: 'Disputa', color: 'error' },
  Expired: { label: 'Expirado', color: 'default' },
  Cancelled: { label: 'Cancelado', color: 'default' },
}

export const WEBHOOK_STATUS: Record<string, StatusMeta> = {
  Processed: { label: 'Processado', color: 'success' },
  Received: { label: 'Recebido', color: 'info' },
  Failed: { label: 'Falhou', color: 'error' },
}

// ── Fase 3: Suporte & Conteúdo ──────────────────────────────────────────────────────────────

export const CONTACT_CATEGORY: Record<string, StatusMeta> = {
  BugReport: { label: 'Bug', color: 'error' },
  FeatureSuggestion: { label: 'Sugestão', color: 'info' },
  Compliment: { label: 'Elogio', color: 'success' },
  Other: { label: 'Outro', color: 'default' },
}

export const CONTACT_STATUS: Record<string, StatusMeta> = {
  Unread: { label: 'Não lida', color: 'warning' },
  Read: { label: 'Lida', color: 'default' },
  Archived: { label: 'Arquivada', color: 'default' },
}

export const ANNOUNCEMENT_TYPE: Record<string, StatusMeta> = {
  Info: { label: 'Info', color: 'info' },
  Feature: { label: 'Novidade', color: 'success' },
  Terms: { label: 'Termos', color: 'warning' },
  Version: { label: 'Versão', color: 'default' },
}

// Rótulos pt-BR da reprodutibilidade de bugs (enum Reproducibility).
export const REPRODUCIBILITY_LABEL: Record<string, string> = {
  Always: 'Sempre',
  Sometimes: 'Às vezes',
  HappenedOnce: 'Aconteceu uma vez',
}

// ── Fase 4: Observabilidade ─────────────────────────────────────────────────────────────────

// Níveis do Serilog que chegam a persistir (o sink só grava >= Warning).
export const LOG_LEVEL: Record<string, StatusMeta> = {
  Warning: { label: 'Aviso', color: 'warning' },
  Error: { label: 'Erro', color: 'error' },
  Fatal: { label: 'Fatal', color: 'error' },
}

export const HEALTH_STATUS: Record<string, StatusMeta> = {
  Healthy: { label: 'Saudável', color: 'success' },
  Degraded: { label: 'Degradado', color: 'warning' },
  Unhealthy: { label: 'Fora do ar', color: 'error' },
}

// Origem do evento na timeline da plataforma.
export const EVENT_SOURCE: Record<string, StatusMeta> = {
  Access: { label: 'Acesso', color: 'info' },
  Webhook: { label: 'Webhook', color: 'default' },
  Audit: { label: 'Auditoria', color: 'success' },
}

// ── Conformidade / LGPD ─────────────────────────────────────────────────────────────────────

// Estado do pedido de exclusão (enum AccountDeletionStatus).
export const DELETION_STATUS: Record<string, StatusMeta> = {
  Requested: { label: 'Solicitada', color: 'warning' },
  Cancelled: { label: 'Cancelada', color: 'default' },
  Effected: { label: 'Efetivada', color: 'error' },
  Purged: { label: 'Expurgada', color: 'default' },
}

// Abrangência do pedido (enum AccountDeletionScope).
export const DELETION_SCOPE: Record<string, StatusMeta> = {
  Account: { label: 'Conta', color: 'error' },
  SingleStore: { label: 'Loja', color: 'warning' },
}

// Quando a carência começa (enum AccountDeletionPath).
export const DELETION_PATH_LABEL: Record<string, string> = {
  DeleteNow: 'Excluir agora',
  AtPeriodEnd: 'No fim do plano',
}

// Evento de acesso (enum AccessEvent) — Marco Civil art. 15.
export const ACCESS_EVENT: Record<string, StatusMeta> = {
  LoggedIn: { label: 'Entrada', color: 'success' },
  LoggedOut: { label: 'Saída', color: 'default' },
}

export function metaFor(map: Record<string, StatusMeta>, key: string): StatusMeta {
  return map[key] ?? { label: key, color: 'default' }
}
