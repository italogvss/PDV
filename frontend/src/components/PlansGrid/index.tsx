import { useMemo, useState } from 'react'
import { Box, Button, Divider, Paper, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckRounded from '@mui/icons-material/CheckRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import StorefrontRounded from '@mui/icons-material/StorefrontRounded'
import { FEATURE_LABELS, type PlanFeature } from '../../constants/entitlements'
import type { Plan } from '../../types/subscription.types'
import {
  entitlementSet,
  FEATURE_KEYS,
  formatLimit,
  formatPrice,
  LIMIT_LABELS,
  LIMIT_ORDER,
  cycleSuffix,
  planCycle,
  shortPlanName,
  type BillingCycle,
} from '../../utils/plans'
import type { PlansGridProps } from './types'

interface Tier {
  key: string
  label: string
  isPro: boolean
  monthly: Plan | null
  annual: Plan | null
}

// Conteúdo de apoio (descrição + destaques) por nome curto de plano — espelha o texto da
// landing (`landingpage/src/pages/preco.astro`). Planos fora deste mapa caem no fallback dinâmico.
const TIER_CONTENT: Record<string, { description: string; itens: string[] }> = {
  Essencial: {
    description: 'Pra quem está começando a organizar as vendas.',
    itens: ['PDV completo com parcelamento', 'Estoque, clientes e despesas', 'Agenda de atendimentos', 'Até 2 funcionários · 1 loja'],
  },
  Profissional: {
    description: 'O queridinho de quem já vende todo dia.',
    itens: ['Tudo do Essencial, e mais:', 'Relatórios e dashboard avançados', 'Funcionários ilimitados', 'Fotos, cargos e até 5 lojas'],
  },
}

function buildTiers(plans: Plan[]): Tier[] {
  const map = new Map<string, Tier>()
  for (const plan of plans) {
    const label = shortPlanName(plan.name)
    const cycle = planCycle(plan)
    if (!map.has(label)) {
      const planSet = entitlementSet(plan.entitlements)
      const isPro = FEATURE_KEYS.some((k) => planSet.has(k.toLowerCase()))
      map.set(label, { key: label, label, isPro, monthly: null, annual: null })
    }
    const tier = map.get(label)!
    if (cycle === 'monthly') tier.monthly = plan
    else tier.annual = plan
  }
  return Array.from(map.values()).sort((a, b) => Number(a.isPro) - Number(b.isPro))
}

interface ComparisonRow {
  label: string
  values: (boolean | string)[]
}

// Lista enxuta do que muda entre os planos (features premium + limites) — não repete o que já
// é igual em todos (módulos), só a diferença que importa na hora de escolher.
function buildComparisonRows(tiers: Tier[]): ComparisonRow[] {
  const planOf = (tier: Tier) => tier.monthly ?? tier.annual

  const featureRows: ComparisonRow[] = FEATURE_KEYS.map((key: PlanFeature) => ({
    label: FEATURE_LABELS[key],
    values: tiers.map((tier) => {
      const plan = planOf(tier)
      return plan ? entitlementSet(plan.entitlements).has(key.toLowerCase()) : false
    }),
  }))

  const limitRows: ComparisonRow[] = LIMIT_ORDER.map((key) => ({
    label: LIMIT_LABELS[key],
    values: tiers.map((tier) => {
      const plan = planOf(tier)
      return plan ? formatLimit(key, plan.limits[key]) : '—'
    }),
  }))

  return [...featureRows, ...limitRows]
}

export default function PlansGrid({
  plans,
  onSelectPlan,
  disabled = false,
  currentPlanId = null,
  ctaLabel = 'Assinar agora',
}: PlansGridProps) {
  const theme = useTheme()
  const [cycle, setCycle] = useState<BillingCycle>('monthly')

  const tiers = useMemo(() => buildTiers(plans), [plans])
  const rows = useMemo(() => buildComparisonRows(tiers), [tiers])

  const gold = theme.palette.premium
  const brand = theme.palette.accent

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Toggle de período */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          role="group"
          aria-label="Período de cobrança"
          sx={{
            display: 'inline-flex',
            gap: 0.5,
            p: 0.5,
            borderRadius: 5,
            bgcolor: 'surface.sunken',
            border: 1,
            borderColor: 'border.subtle',
          }}
        >
          {(['monthly', 'annual'] as BillingCycle[]).map((c) => {
            const active = cycle === c
            return (
              <Box
                key={c}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => setCycle(c)}
                sx={{
                  cursor: 'pointer',
                  border: 0,
                  borderRadius: 5,
                  px: 2.5,
                  py: 0.875,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 13,
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? 'primary.contrastText' : 'text.secondary',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': { color: active ? 'primary.contrastText' : 'text.primary' },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                }}
              >
                {c === 'monthly' ? 'Mensal' : 'Anual'}
                {c === 'annual' && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      px: 1,
                      py: 0.5,
                      ml: 1,
                      borderRadius: 5,
                      bgcolor: active ? alpha(theme.palette.primary.contrastText, 0.22) : gold[500],
                      color: active ? theme.palette.primary.contrastText : gold[900],
                    }}
                  >
                    2 MESES GRÁTIS
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Cards dos planos */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.max(tiers.length, 1)}, 1fr)` },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        {tiers.map((tier) => {
          const variant = (cycle === 'annual' ? tier.annual : tier.monthly) ?? tier.monthly ?? tier.annual
          // Compara a variante exata (Pro Mensal ≠ Pro Anual): trocar de periodicidade é uma troca válida.
          const isCurrent = !!variant && variant.id === currentPlanId
          const content = TIER_CONTENT[tier.label]
          const description = content?.description ?? variant?.description ?? ''
          const itens = content?.itens ?? []
          const savings =
            tier.monthly && tier.annual ? Math.max(0, tier.monthly.price * 12 - tier.annual.price) : 0
          const tone = tier.isPro ? gold : brand
          const Icon = tier.isPro ? WorkspacePremiumRounded : StorefrontRounded

          return (
            <Paper
              key={tier.key}
              variant="outlined"
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                p: 3,
                borderRadius: 3,
                borderColor: tier.isPro ? tone[300] : 'divider',
                borderWidth: tier.isPro ? 2 : 1,
                bgcolor: tier.isPro ? alpha(tone[100], 0.4) : 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(tone[500], 0.14),
                    color: tone[700],
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
                  {tier.label}
                </Typography>
              </Box>

              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    R$ {variant ? formatPrice(variant.price) : '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {cycleSuffix(cycle)}
                  </Typography>
                </Box>
                {cycle === 'annual' && savings > 0 && (
                  <Typography variant="caption" sx={{ color: tone[700], fontWeight: 700 }}>
                    Economize R$ {formatPrice(savings)} no ano
                  </Typography>
                )}
              </Box>

              {itens.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {itens.map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckRounded sx={{ fontSize: 17, color: tone[600], flexShrink: 0, mt: 0.25 }} />
                      <Typography variant="body2" color="text.primary">
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                variant={isCurrent ? 'outlined' : 'contained'}
                endIcon={isCurrent ? undefined : <ArrowForwardRounded />}
                disabled={!variant || disabled || isCurrent}
                onClick={() => variant && onSelectPlan(variant)}
                sx={{
                  mt: 'auto',
                  fontWeight: 700,
                  ...(tier.isPro && !isCurrent
                    ? {
                        bgcolor: tone[900],
                        color: tone[50],
                        '&:hover': { bgcolor: tone[800] },
                      }
                    : {}),
                }}
              >
                {isCurrent ? 'Plano atual' : ctaLabel}
              </Button>
            </Paper>
          )
        })}
      </Box>

      {rows.length > 0 && (
        <>
          <Divider />

          {/* Breve comparativo do que muda entre os planos */}
          <Box>
            <Typography variant="overline" sx={{ color: 'text.tertiary', fontWeight: 700, letterSpacing: '0.08em' }}>
              O que muda entre os planos
            </Typography>
            <Box sx={{ mt: 1.5, overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <Box component="thead">
                  <Box component="tr">
                    <Box component="th" sx={{ textAlign: 'left', py: 1, fontSize: 13, color: 'text.tertiary', fontWeight: 700 }}>
                      Recurso
                    </Box>
                    {tiers.map((tier) => (
                      <Box
                        component="th"
                        key={tier.key}
                        sx={{ textAlign: 'center', py: 1, fontSize: 13, color: tier.isPro ? gold[700] : 'text.tertiary', fontWeight: 700 }}
                      >
                        {tier.label}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {rows.map((row) => (
                    <Box component="tr" key={row.label} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Box component="td" sx={{ py: 1, fontSize: 13.5, color: 'text.primary' }}>
                        {row.label}
                      </Box>
                      {row.values.map((value, idx) => (
                        <Box component="td" key={idx} sx={{ py: 1, textAlign: 'center' }}>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CheckRounded sx={{ fontSize: 17, color: 'success.main' }} />
                            ) : (
                              <Typography component="span" color="text.disabled">
                                —
                              </Typography>
                            )
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {value}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}
