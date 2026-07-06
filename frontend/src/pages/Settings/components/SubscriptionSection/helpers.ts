import type { Subscription, SubscriptionStatus } from '../../../../types/subscription.types'
import { ALL_MODULES, OPERATION_MODULES } from '../../../../constants/modules'

// Helpers sobre o *shape* de Plan (preço, ciclo, entitlements, limites) moraram aqui antes de
// serem compartilhados com a tela `/planos` — reexportados pra não quebrar os imports existentes.
export {
  formatPrice,
  entitlementSet,
  FEATURE_KEYS,
  LIMIT_ORDER,
  LIMIT_LABELS,
  formatLimit,
  planCycle,
  cycleSuffix,
  shortPlanName,
  type BillingCycle,
} from '../../../../utils/plans'

// Configuração visual por status — rótulo + tokens de cor do tema (nunca hex).
export interface StatusConfig {
  label: string
  chipBg: string
  chipColor: string
}

export const STATUS_CONFIG: Record<SubscriptionStatus, StatusConfig> = {
  None: { label: 'SEM PLANO', chipBg: 'surface.raised', chipColor: 'text.secondary' },
  Pending: { label: 'PROCESSANDO', chipBg: 'warning.soft', chipColor: 'warning.ink' },
  Active: { label: 'ATIVO', chipBg: 'success.soft', chipColor: 'success.ink' },
  Trialing: { label: 'EM TESTE', chipBg: 'premium.100', chipColor: 'premium.900' },
  Canceled: { label: 'CANCELADO', chipBg: 'surface.raised', chipColor: 'text.secondary' },
  Expired: { label: 'EXPIRADO', chipBg: 'error.soft', chipColor: 'error.ink' },
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Rótulos dos módulos. OPERATION_MODULES não inclui 'employees' (módulo de billing, não de acesso),
// então o completamos aqui para o paper de recursos inclusos.
export const MODULE_LABELS: Record<string, string> = {
  ...Object.fromEntries(ALL_MODULES.map((m) => [m, OPERATION_MODULES[m].label])),
  employees: 'Funcionários',
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
    case 'Active': {
      const date = formatDate(subscription.currentPeriodEnd)
      return date ? { label: 'Renovação em', date } : null
    }
    default:
      return null
  }
}
