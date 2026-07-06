import type { Plan } from '../types/subscription.types'
import { FEATURE_LABELS, UNLIMITED, type PlanFeature, type PlanLimitKey } from '../constants/entitlements'

// Helpers sobre o *shape* de `Plan` (preço, ciclo, entitlements, limites) — usados tanto pela
// grade de planos (`PlansGrid`, tela `/planos` e `PlansDialog`) quanto pelo resumo de assinatura
// em Configurações (`SubscriptionSection/helpers.ts`, que reexporta o que ainda usa daqui).

export function formatPrice(value: number): string {
  if (value == null || value <= 0) return 'Grátis'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Capabilities (billing) → rótulos PT-BR ────────────────────────────────────────────────────
// Todas as chaves de feature premium, na ordem de exibição do catálogo do frontend.
export const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as PlanFeature[]

// A comparação de entitlements é case-insensitive: o backend usa OrdinalIgnoreCase e dados legados
// podem estar em minúsculas (ex.: "advanceddashboard"), enquanto as chaves canônicas são camelCase.
export function entitlementSet(keys: string[]): Set<string> {
  return new Set(keys.map((k) => k.toLowerCase()))
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
