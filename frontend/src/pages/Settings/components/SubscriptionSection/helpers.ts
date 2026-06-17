import type { Subscription, SubscriptionStatus } from '../../../../types/subscription.types'

// Configuração visual por status — rótulo + tokens de cor do tema (nunca hex).
export interface StatusConfig {
  label: string
  chipBg: string
  chipColor: string
}

export const STATUS_CONFIG: Record<SubscriptionStatus, StatusConfig> = {
  Active: { label: 'ATIVO', chipBg: 'success.soft', chipColor: 'success.ink' },
  Trialing: { label: 'EM TESTE', chipBg: 'premium.100', chipColor: 'premium.900' },
  PastDue: { label: 'PAGAMENTO PENDENTE', chipBg: 'warning.soft', chipColor: 'warning.ink' },
  Canceled: { label: 'CANCELADO', chipBg: 'surface.raised', chipColor: 'text.secondary' },
  Expired: { label: 'EXPIRADO', chipBg: 'error.soft', chipColor: 'error.ink' },
}

export function formatPrice(value: number): string {
  if (value <= 0) return 'Grátis'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Linha de status do banner: rótulo + data, coerente com o estado da assinatura.
// Canceled mantém o acesso até o fim do período (não renova) → "Acesso até".
export function getStatusLine(subscription: Subscription): { label: string; date: string } | null {
  switch (subscription.status) {
    case 'Trialing': {
      const date = formatDate(subscription.trialEndsAt)
      return date ? { label: 'Período de teste termina em', date } : null
    }
    case 'Canceled': {
      const date = formatDate(subscription.currentPeriodEnd ?? subscription.trialEndsAt)
      return date ? { label: 'Acesso até', date } : null
    }
    case 'Active':
    case 'PastDue': {
      const date = formatDate(subscription.currentPeriodEnd)
      return date ? { label: 'Renovação em', date } : null
    }
    default:
      return null
  }
}
