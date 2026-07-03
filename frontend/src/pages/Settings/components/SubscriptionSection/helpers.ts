import type { Plan, Subscription, SubscriptionStatus } from '../../../../types/subscription.types'
import { ALL_MODULES, OPERATION_MODULES } from '../../../../constants/modules'
import { FEATURE_LABELS, UNLIMITED, type PlanFeature, type PlanLimitKey } from '../../../../constants/entitlements'

// Configuração visual por status — rótulo + tokens de cor do tema (nunca hex).
export interface StatusConfig {
  label: string
  chipBg: string
  chipColor: string
}

export const STATUS_CONFIG: Record<SubscriptionStatus, StatusConfig> = {
  None: { label: 'GRATUITO', chipBg: 'surface.raised', chipColor: 'text.secondary' },
  Pending: { label: 'PROCESSANDO', chipBg: 'warning.soft', chipColor: 'warning.ink' },
  Active: { label: 'ATIVO', chipBg: 'success.soft', chipColor: 'success.ink' },
  Trialing: { label: 'EM TESTE', chipBg: 'premium.100', chipColor: 'premium.900' },
  Canceled: { label: 'CANCELADO', chipBg: 'surface.raised', chipColor: 'text.secondary' },
  Expired: { label: 'EXPIRADO', chipBg: 'error.soft', chipColor: 'error.ink' },
}

export function formatPrice(value: number): string {
  if (value == null || value <= 0) return 'Grátis'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Capabilities (billing) → rótulos PT-BR ────────────────────────────────────────────────────
// Todas as chaves de feature premium, na ordem de exibição do catálogo do frontend.
export const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as PlanFeature[]

// A comparação de entitlements é case-insensitive: o backend usa OrdinalIgnoreCase e dados legados
// podem estar em minúsculas (ex.: "advanceddashboard"), enquanto as chaves canônicas são camelCase.
export function entitlementSet(keys: string[]): Set<string> {
  return new Set(keys.map((k) => k.toLowerCase()))
}

// Rótulos dos módulos. OPERATION_MODULES não inclui 'employees' (módulo de billing, não de acesso),
// então o completamos aqui para o paper de recursos inclusos.
export const MODULE_LABELS: Record<string, string> = {
  ...Object.fromEntries(ALL_MODULES.map((m) => [m, OPERATION_MODULES[m].label])),
  employees: 'Funcionários',
}

// ── Limites numéricos do plano ────────────────────────────────────────────────────────────────
export const LIMIT_ORDER: PlanLimitKey[] = ['employees', 'stores', 'saleHistoryDays', 'auditDays']

export const LIMIT_LABELS: Record<PlanLimitKey, string> = {
  employees: 'Funcionários',
  stores: 'Lojas',
  saleHistoryDays: 'Histórico de vendas',
  auditDays: 'Auditoria',
}

// Valor legível de um limite. -1 = ilimitado (gênero acompanha o rótulo); dias mantêm a unidade.
export function formatLimit(key: PlanLimitKey, value: number | undefined): string {
  if (value === undefined) return '—'
  if (value === UNLIMITED) {
    if (key === 'stores') return 'Ilimitadas'
    if (key === 'auditDays') return 'Ilimitada'
    return 'Ilimitados'
  }
  if (key === 'saleHistoryDays' || key === 'auditDays') return `${value} ${value === 1 ? 'dia' : 'dias'}`
  return String(value)
}

// ── Período de cobrança ───────────────────────────────────────────────────────────────────────
// O contrato do frontend não expõe o período — inferimos pelo nome do plano ("... Anual"/"... Mensal").
export type BillingCycle = 'monthly' | 'annual'

export function planCycle(plan: Pick<Plan, 'name'>): BillingCycle {
  return /anual/i.test(plan.name) ? 'annual' : 'monthly'
}

export function cycleSuffix(cycle: BillingCycle): string {
  return cycle === 'annual' ? '/ano' : '/mês'
}

// Nome curto do plano sem o prefixo "Plano" nem o sufixo de período.
export function shortPlanName(name: string): string {
  return name.replace(/^Plano\s+/i, '').replace(/\s+(Mensal|Anual)$/i, '').trim()
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
