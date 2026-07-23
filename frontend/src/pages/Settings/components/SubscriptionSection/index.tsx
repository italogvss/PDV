import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  Paper,
  Switch,
  Typography,
} from '@mui/material'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import type { GridColDef } from '@mui/x-data-grid'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../components/DataGridNoRowsOverlay'
import { usePaymentHistory } from '../../../../hooks/useBilling'
import type { UserPayment } from '../../../../types/billing.types'
import { alpha, useTheme } from '@mui/material/styles'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import StorefrontRounded from '@mui/icons-material/StorefrontRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CancelOutlined from '@mui/icons-material/CancelOutlined'
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined'
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import {
  useSubscription,
  usePlans,
  useCancelSubscription,
  useChangePlan,
  useChangePlanPreview,
} from '../../../../hooks/useSubscription'
import { formatCents } from '../../../../utils/currency'
import { FEATURE_LABELS, UNLIMITED, type PlanLimitKey } from '../../../../constants/entitlements'
import type { Plan } from '../../../../types/subscription.types'
import {
  STATUS_CONFIG,
  RETENTION_DAYS,
  formatPrice,
  formatDate,
  getStatusLine,
  isWithinRefundWindow,
  isDowngrade,
  cycleSuffix,
  planCycle,
  shortPlanName,
  entitlementSet,
  FEATURE_KEYS,
  MODULE_LABELS,
  LIMIT_ORDER,
  LIMIT_LABELS,
  formatLimit,
  type BillingCycle,
} from './helpers'
import PlanCheckoutDialog from './PlanCheckoutDialog'
import PlansDialog from './PlansDialog'
import type { PlansDialogMode } from './PlansDialog/types'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import PlansGrid from '../../../../components/PlansGrid'

const LIMIT_ICONS: Record<PlanLimitKey, SvgIconComponent> = {
  employees: GroupsOutlined,
  stores: StorefrontOutlined,
  saleHistoryDays: ReceiptLongOutlined,
  auditDays: VerifiedUserOutlined,
}

// ── Histórico de cobranças (ex-Faturas) ─────────────────────────────────────────────────────
function formatAmount(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPaymentDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface BadgeBoxProps { color: string; text: string; italic?: boolean }

function BadgeBox({ color, text, italic }: BadgeBoxProps) {
  return (
    <Box sx={{
      px: 1.5, py: 0.75, borderRadius: 1, bgcolor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 52, flexShrink: 0,
    }}>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12, fontStyle: italic ? 'italic' : 'normal', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {text}
      </Typography>
    </Box>
  )
}

function CardBrandBadge({ brand }: { brand: string | null }) {
  const b = (brand ?? '').toLowerCase()
  if (b.includes('visa')) return <BadgeBox color="#1a1f71" text="VISA" italic />
  if (b.includes('master') || b === 'mc') return <BadgeBox color="#eb5c29" text="MC" />
  if (b.includes('amex') || b.includes('american')) return <BadgeBox color="#007bc1" text="AMEX" />
  if (b.includes('elo')) return <BadgeBox color="#00a4e0" text="ELO" />
  if (b.includes('hiper')) return <BadgeBox color="#e6462e" text="HIPER" />
  return <BadgeBox color="#555" text={(brand ?? 'Card').substring(0, 4).toUpperCase()} />
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Paid: 'Pago',
  Pending: 'Pendente',
  Failed: 'Recusado',
  Refunded: 'Reembolsado',
  Disputed: 'Contestado',
  Expired: 'Expirado',
  Cancelled: 'Cancelado',
}

const PAYMENT_STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  Paid: { bgcolor: 'success.soft', color: 'success.ink' },
  Pending: { bgcolor: 'warning.soft', color: 'warning.ink' },
  Failed: { bgcolor: 'error.soft', color: 'error.ink' },
  Refunded: { bgcolor: 'info.soft', color: 'info.ink' },
  Disputed: { bgcolor: 'error.soft', color: 'error.ink' },
  Expired: { bgcolor: 'action.hover', color: 'text.secondary' },
  Cancelled: { bgcolor: 'action.hover', color: 'text.secondary' },
}

// Numa cobrança recusada o gateway ainda retenta — o número da tentativa diz ao usuário quanto
// tempo ele tem para atualizar o cartão antes do cancelamento automático.
function PaymentStatusChip({ status, retryNumber }: { status: string; retryNumber?: number | null }) {
  const sx = PAYMENT_STATUS_COLORS[status] ?? { bgcolor: 'action.hover', color: 'text.secondary' }
  const label = PAYMENT_STATUS_LABELS[status] ?? status
  const suffix = status === 'Failed' && retryNumber ? ` (tentativa ${retryNumber})` : ''
  return <Chip label={`${label}${suffix}`} size="small" sx={{ ...sx, fontWeight: 600 }} />
}

const PAYMENT_KIND_LABELS: Record<string, string> = {
  CardSubscription: 'Assinatura',
  OneOffCheckout: 'Avulso',
}

const paymentColumns: GridColDef<UserPayment>[] = [
  {
    field: 'method',
    headerName: 'Método',
    flex: 1.8,
    minWidth: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
        <CardBrandBadge brand={row.cardBrand} />
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
            {`•••• •••• •••• ${row.cardLastFour ?? '????'}`}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    field: 'kind',
    headerName: 'Tipo',
    width: 120,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {PAYMENT_KIND_LABELS[row.kind] ?? row.kind}
      </Typography>
    ),
  },
  {
    field: 'amountCents',
    headerName: 'Valor',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatAmount(row.amountCents)}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 180,
    sortable: false,
    renderCell: ({ row }) => <PaymentStatusChip status={row.status} retryNumber={row.retryNumber} />,
  },
  {
    field: 'paidAt',
    headerName: 'Pago em',
    width: 120,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatPaymentDate(row.paidAt ?? row.createdAt)}
      </Typography>
    ),
  },
  {
    field: 'receiptUrl',
    headerName: '',
    width: 48,
    sortable: false,
    renderCell: ({ row }) =>
      row.receiptUrl ? (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <OpenInNewOutlined sx={{ fontSize: 16, color: 'text.tertiary' }} />
        </Box>
      ) : null,
  },
]

export default function SubscriptionSection() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data: subscription, isLoading: loadingSub } = useSubscription()
  const { data: plans, isLoading: loadingPlans } = usePlans()
  const changePlan = useChangePlan()
  const cancel = useCancelSubscription()
  const { data: paymentHistory, isLoading: loadingPayments } = usePaymentHistory()
  const payments = paymentHistory?.data ?? []

  // Checkout de contratação nova (assinatura não-viva) → redireciona para o gateway via este diálogo.
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null)
  // Grade de planos: `checkout` leva ao pagamento (reassinatura); `change` troca o plano de uma
  // assinatura viva. null = fechada.
  const [plansDialogMode, setPlansDialogMode] = useState<PlansDialogMode | null>(null)
  // Período escolhido no upsell (só afeta qual variante do Profissional é contratada).
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  // Confirmação de cancelamento de assinatura.
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  // Plano-alvo de uma troca aguardando confirmação — a mensagem muda conforme upgrade × downgrade.
  const [changeTarget, setChangeTarget] = useState<Plan | null>(null)

  // ═══ DEV — SÓ EM DESENVOLVIMENTO ══════════════════════════════════════════════════════════
  // Switches para forçar a exibição dos alertas/paper condicionais desta tela sem precisar
  // alterar a assinatura real (só para revisão visual). O painel que os controla é renderizado
  // apenas quando `import.meta.env.DEV` — no build de produção o Vite elimina o bloco, então
  // nenhum destes switches tem como ser ligado e todos os `|| devShowX` viram no-op.
  // Se algum dia quiser remover de vez: apague estes 7 estados, o painel gateado por
  // `import.meta.env.DEV` no início do JSX abaixo e os `|| devShowX` adicionados às condições.
  const [devShowPaymentFailed, setDevShowPaymentFailed] = useState(false)
  const [devShowPendingPlan, setDevShowPendingPlan] = useState(false)
  const [devShowUpgrade, setDevShowUpgrade] = useState(false)
  const [devShowResubscribe, setDevShowResubscribe] = useState(false)
  const [devShowAwaitingRefund, setDevShowAwaitingRefund] = useState(false)
  const [devShowExpiredGrid, setDevShowExpiredGrid] = useState(false)
  // Força o modal "trocar de plano" a exibir a variante agendada (downgrade) — por padrão ele
  // mostra o que a troca real calcular (normalmente upgrade, via proMonthly no botão de dev).
  const [devForceChangeDowngrade, setDevForceChangeDowngrade] = useState(false)
  // ═════════════════════════════════════════════════════════════════════════════════════════

  // Estado derivado com optional chaining (subscription pode ainda não ter carregado) — precisa vir
  // antes do guard de loading abaixo pra respeitar Rules of Hooks: `useChangePlanPreview` tem que ser
  // chamado sempre na mesma posição, senão o React acusa "mais hooks que no render anterior" assim
  // que os dados chegam.
  const isTrial = subscription?.status === 'Trialing'
  const isLive = subscription?.status === 'Active' || subscription?.status === 'Trialing'
  const isLiveCard = isLive && subscription?.method === 'Card'

  // Simulação da troca (só para assinatura paga; no trial não há gateway nem cobrança). O diálogo
  // deriva a mensagem daqui — quando a troca é agendada, quanto é cobrado agora, quando o plano novo
  // vale — sem reimplementar a regra do backend (RF-36/RF-37).
  const previewPlanId = changeTarget && isLiveCard && !isTrial ? changeTarget.id : null
  const { data: changePreview, isLoading: previewLoading } = useChangePlanPreview(previewPlanId)

  if (loadingSub || loadingPlans || !subscription || !plans) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  // ── Cores da marca ────────────────────────────────────────────────────────────────────────
  const white = theme.palette.common.white
  const gold = theme.palette.premium // dourado do plano Profissional
  const brand = theme.palette.accent // cor secundária/accent do plano Essencial

  // ── Estado da assinatura ──────────────────────────────────────────────────────────────────
  const owned = subscription.entitlements ?? []
  const ownedSet = entitlementSet(owned)
  const has = (key: string) => ownedSet.has(key.toLowerCase())
  const currentPlan = plans.find((p) => p.id === subscription.planId) ?? null
  const isPaid = subscription.planId !== null
  // Expirada: o plano guardado em `subscription.planId` não vale mais (entitlements já vêm vazios
  // do backend) — preço e o card de recursos não devem ser exibidos como se ainda valessem (#4/RF-07.5).
  const isExpired = subscription.status === 'Expired'
  const canCancel = isPaid && isLive
  const statusLine = getStatusLine(subscription)

  // Tier = tem alguma feature premium? (Essencial concede 0 features; Profissional concede todas.)
  const isPro = FEATURE_KEYS.some((k) => has(k))

  // Estilo do banner: premium (dourado) para o Pro, secondary (accent) para o Essencial.
  const tier = isPro
    ? {
        ink: gold[900],
        inkMuted: alpha(gold[900], 0.72),
        gradient: `linear-gradient(135deg, ${gold[200]} 0%, ${gold[400]} 52%, ${gold[500]} 100%)`,
        pillBg: alpha(gold[900], 0.1),
        glyph: alpha(gold[900], 0.14),
        Icon: WorkspacePremiumRounded,
      }
    : {
        ink: white,
        inkMuted: alpha(white, 0.82),
        gradient: `linear-gradient(135deg, ${brand[600]} 0%, ${brand[700]} 55%, ${brand[800]} 100%)`,
        pillBg: alpha(white, 0.22),
        glyph: alpha(white, 0.16),
        Icon: StorefrontRounded,
      }

  const planTitle = currentPlan ? shortPlanName(currentPlan.name) : subscription.planName ?? 'Sem plano ativo'
  const currentCycle = currentPlan ? planCycle(currentPlan) : 'monthly'
  const statusLabel = STATUS_CONFIG[subscription.status].label
  const statusText =
    isPaid && statusLine
      ? `${statusLine.label} ${statusLine.date}`
      : 'Nenhum plano ativo — assine para usar o sistema.'
  const checkColor = isPro ? gold[600] : theme.palette.secondary.main

  // Recursos inclusos no plano atual.
  const includedModules = Object.keys(MODULE_LABELS)
    .filter((k) => has(k))
    .map((k) => MODULE_LABELS[k])
  const includedFeatures = FEATURE_KEYS.filter((k) => has(k)).map((k) => FEATURE_LABELS[k])

  // ── Upsell: variantes do Profissional (plano que concede features premium) ───────────────────
  const proPlans = plans.filter((p) => {
    const planSet = entitlementSet(p.entitlements)
    return FEATURE_KEYS.some((k) => planSet.has(k.toLowerCase()))
  })
  const proMonthly = proPlans.find((p) => planCycle(p) === 'monthly') ?? proPlans[0] ?? null
  const proAnnual = proPlans.find((p) => planCycle(p) === 'annual') ?? null
  const upgradeTarget = cycle === 'annual' ? proAnnual ?? proMonthly : proMonthly
  // Upsell do Profissional só faz sentido para quem tem assinatura viva não-Pro (upgrade).
  const showUpgrade = isLive && !isPro && upgradeTarget !== null

  // Reassinar/reativar: estados sem assinatura viva (cancelada/expirada/sem plano/checkout
  // abandonado). Reativa o plano atual quando existe; senão sugere o Profissional (ou o 1º plano)
  // como alvo padrão. `Pending` entra aqui pra não deixar o usuário sem nenhum CTA quando o
  // checkout anterior não foi concluído — StartCheckoutAsync já permite nova tentativa nesse
  // estado, só faltava expor (RF-02.7).
  const isPendingCheckout = subscription.status === 'Pending'
  // Reembolso pendente não oferece reativação: o backend bloqueia o checkout até o estorno ser
  // aprovado, senão o `checkout.refunded` derrubaria a assinatura nova.
  const awaitingRefund = subscription.status === 'RefundRequested'
  // Expirada tem tratamento à parte (grade de planos cheia no lugar do banner, ver mais abaixo) —
  // por isso sai da lista genérica de "reassinar com 1 CTA".
  const showResubscribe =
    subscription.status === 'Canceled' ||
    subscription.status === 'None' ||
    isPendingCheckout
  const resubscribeTarget = currentPlan ?? proMonthly ?? plans[0] ?? null
  // Cancelada mas ainda dentro do período pago → reativar gera cobrança imediata (aviso na UI).
  const hasRemainingAccess =
    subscription.status === 'Canceled' &&
    !!subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date()

  const targetSet = upgradeTarget ? entitlementSet(upgradeTarget.entitlements) : null
  const newFeatures = targetSet
    ? FEATURE_KEYS.filter((k) => targetSet.has(k.toLowerCase()) && !has(k)).map((k) => FEATURE_LABELS[k])
    : []
  const annualSavings =
    proMonthly && proAnnual ? Math.max(0, proMonthly.price * 12 - proAnnual.price) : 0
  const upgradeLimits: { icon: SvgIconComponent; text: string }[] = upgradeTarget
    ? [
        {
          icon: GroupsOutlined,
          text:
            upgradeTarget.limits.employees === UNLIMITED
              ? 'Funcionários ilimitados'
              : `Até ${upgradeTarget.limits.employees} funcionários`,
        },
        {
          icon: StorefrontOutlined,
          text:
            upgradeTarget.limits.stores === UNLIMITED
              ? 'Lojas ilimitadas'
              : `Até ${upgradeTarget.limits.stores} lojas`,
        },
        {
          icon: ReceiptLongOutlined,
          text:
            upgradeTarget.limits.saleHistoryDays === UNLIMITED
              ? 'Histórico de vendas ilimitado'
              : `${upgradeTarget.limits.saleHistoryDays} dias de histórico`,
        },
      ]
    : []

  const ctaLabel = changePlan.isPending
    ? 'Alterando...'
    : isLiveCard
      ? 'Fazer upgrade agora'
      : 'Assinar Profissional'

  // Assinatura viva → troca de plano (confirma antes); demais estados → checkout.
  const askToChangePlan = (plan: Plan) => {
    if (isLiveCard) setChangeTarget(plan)
    else setCheckoutPlan(plan)
  }

  const handleConfirmChange = () => {
    if (!changeTarget) return
    changePlan.mutate(changeTarget.id, { onSuccess: () => setChangeTarget(null) })
  }

  // Fallback local enquanto a simulação carrega (ou falha): retira recursos/encolhe limites. Não
  // cobre o caso "encurta o ciclo" — por isso a simulação do backend é a fonte da verdade.
  const changeLosesCapabilities = !!currentPlan && !!changeTarget && !isTrial && isDowngrade(currentPlan, changeTarget)
  // Agendada = a simulação diz que sim; enquanto ela não chega, usa o palpite local.
  // devForceChangeDowngrade força a variante agendada por cima do que a simulação calculou (dev).
  const changeIsScheduled = devForceChangeDowngrade || (changePreview?.scheduled ?? changeLosesCapabilities)

  const changeTargetSet = changeTarget ? entitlementSet(changeTarget.entitlements) : null
  const lostFeatures = changeTargetSet
    ? FEATURE_KEYS.filter((k) => has(k) && !changeTargetSet.has(k.toLowerCase())).map((k) => FEATURE_LABELS[k])
    : []
  const chargeNow = changePreview?.amountDueNowCents ?? null

  const changeDescription = changeTarget && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {isTrial && (
        <Typography variant="body2">
          O plano <strong>{shortPlanName(changeTarget.name)}</strong> passa a valer imediatamente pelo
          resto do seu período de teste. Nenhuma cobrança é feita agora, e você escolhe o plano
          definitivo na hora de assinar.
        </Typography>
      )}

      {!isTrial && previewLoading && (
        <Typography variant="body2" color="text.secondary">
          Calculando os valores da troca...
        </Typography>
      )}

      {!isTrial && !previewLoading && !changeIsScheduled && (
        <>
          <Typography variant="body2">
            O plano <strong>{shortPlanName(changeTarget.name)}</strong> passa a valer{' '}
            <strong>imediatamente</strong> — os novos recursos já ficam disponíveis.
          </Typography>
          <Typography variant="body2">
            <strong>
              A cobrança é feita agora, no cartão cadastrado
              {chargeNow !== null ? `: ${formatCents(chargeNow)}` : ''}.
            </strong>{' '}
            Esse valor é a diferença proporcional aos dias que faltam no seu ciclo atual: pegamos o
            preço do plano {shortPlanName(changeTarget.name)} para o tempo restante e descontamos o
            crédito do que você já pagou e ainda não usou no plano atual.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`A partir da próxima renovação${changePreview?.nextChargeAt ? ` (${formatDate(changePreview.nextChargeAt)})` : ''}, o valor passa a ser R$ ${formatPrice(changeTarget.price)} por período.`}
          </Typography>
        </>
      )}

      {!isTrial && !previewLoading && changeIsScheduled && (
        <>
          <Typography variant="body2">
            Você continua no plano <strong>{planTitle}</strong>{' '}
            {changePreview?.effectiveAt
              ? `até ${formatDate(changePreview.effectiveAt)}`
              : statusLine?.date
                ? `até ${statusLine.date}`
                : 'até o fim do período já pago'}{' '}
            — o período que já pagou é honrado por inteiro. A partir daí o plano{' '}
            <strong>{shortPlanName(changeTarget.name)}</strong> passa a valer, por R${' '}
            {formatPrice(changeTarget.price)}.
          </Typography>
          {lostFeatures.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Quando a troca entrar em vigor, você deixa de ter: {lostFeatures.join(', ')}.
            </Typography>
          )}
        </>
      )}
    </Box>
  )

  const goToExport = () => navigate('/configuracoes?tab=backup')

  // Três desfechos possíveis, e a confirmação precisa dizer exatamente qual é o do usuário:
  //   trial            → o teste acaba na hora, sem cobrança envolvida;
  //   janela de 7 dias → a assinatura acaba na hora e o dinheiro é devolvido;
  //   fora da janela   → só as próximas faturas param; o período pago segue valendo.
  // Em todos, a loja continua acessível durante a retenção — daí o link de exportação.
  const inRefundWindow = isWithinRefundWindow(subscription)

  const cancelDescription = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {isTrial && (
        <Typography variant="body2">
          Ao cancelar agora, seu período de teste termina <strong>imediatamente</strong> e você perde
          o acesso ao plano.
        </Typography>
      )}

      {!isTrial && inRefundWindow && (
        <Typography variant="body2">
          Você está dentro do prazo de arrependimento (até{' '}
          {formatDate(subscription.refundEligibleUntil)}). Sua assinatura será encerrada{' '}
          <strong>imediatamente</strong> e o valor pago será devolvido — o reembolso é processado em
          alguns dias úteis.
        </Typography>
      )}

      {!isTrial && !inRefundWindow && (
        <Typography variant="body2">
          Sua assinatura não será renovada. Você mantém o acesso{' '}
          {statusLine?.date ? `até ${statusLine.date}` : 'até o fim do período já pago'}.
        </Typography>
      )}

      <Typography variant="body2">
        Sua conta continua ativa e seus dados ficam disponíveis por{' '}
        <strong>{RETENTION_DAYS} dias</strong> para você exportá-los ou assinar novamente —{' '}
        <Link component="button" type="button" onClick={goToExport} sx={{ fontWeight: 700 }}>
          exportar meus dados
        </Link>
        .
      </Typography>
    </Box>
  )

  const handleCancel = () => {
    cancel.mutate(undefined, { onSuccess: () => setConfirmCancelOpen(false) })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ══ DEV — painel para forçar a exibição dos alertas/modais desta tela sem alterar a
          assinatura real. Gateado por `import.meta.env.DEV`: o Vite remove este bloco do build
          de produção. Ver detalhes no bloco de estados `devShow*` no topo do componente. ══ */}
      {import.meta.env.DEV && (
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          borderStyle: 'dashed',
          borderColor: 'warning.main',
          bgcolor: alpha(theme.palette.warning.main, 0.08),
          p: 2.5,
        }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, color: 'warning.ink', letterSpacing: '0.06em' }}>
          Dev — forçar visualização (remover antes de subir)
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devShowPaymentFailed}
                onChange={(e) => setDevShowPaymentFailed(e.target.checked)}
              />
            }
            label="Cobrança recusada"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devShowPendingPlan}
                onChange={(e) => setDevShowPendingPlan(e.target.checked)}
              />
            }
            label="Downgrade agendado"
          />
          <FormControlLabel
            control={
              <Switch size="small" checked={devShowUpgrade} onChange={(e) => setDevShowUpgrade(e.target.checked)} />
            }
            label="Upsell Profissional"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devShowResubscribe}
                onChange={(e) => setDevShowResubscribe(e.target.checked)}
              />
            }
            label="Reassinar/reativar"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devShowAwaitingRefund}
                onChange={(e) => setDevShowAwaitingRefund(e.target.checked)}
              />
            }
            label="Reembolso em análise"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devShowExpiredGrid}
                onChange={(e) => setDevShowExpiredGrid(e.target.checked)}
              />
            }
            label="Expirado: grade de planos"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={devForceChangeDowngrade}
                onChange={(e) => setDevForceChangeDowngrade(e.target.checked)}
              />
            }
            label="Trocar de plano: forçar downgrade"
          />
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setConfirmCancelOpen(true)}>
            Modal: cancelar assinatura
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!proMonthly && plans.length === 0}
            onClick={() => setChangeTarget(proMonthly ?? plans[0] ?? null)}
          >
            Modal: trocar de plano
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={plans.length === 0}
            onClick={() => setCheckoutPlan(plans[0] ?? null)}
          >
            Modal: checkout
          </Button>
          <Button size="small" variant="outlined" onClick={() => setPlansDialogMode('checkout')}>
            Modal: grade de planos (checkout)
          </Button>
          <Button size="small" variant="outlined" onClick={() => setPlansDialogMode('change')}>
            Modal: grade de planos (troca)
          </Button>
        </Box>
      </Paper>
      )}

      {/* ══ Cobrança recusada — o gateway ainda retenta, mas o cartão precisa ser atualizado ══ */}
      {(subscription.lastPaymentFailedAt || devShowPaymentFailed) && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ borderRadius: 3, alignItems: 'center', backgroundColor: "error.soft",}}
          action={
            <Button sx={{mr: 3}} color="error" variant="contained" size="small" onClick={() => setPlansDialogMode('checkout')}>
              Assinar novamente
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Não conseguimos cobrar seu cartão</AlertTitle>
          A cobrança da renovação de {formatDate(subscription.lastPaymentFailedAt ?? new Date().toISOString())} foi
          recusada
          {subscription.paymentRetryNumber ? ` (tentativa ${subscription.paymentRetryNumber})` : ''}. Seu
          acesso ficará bloqueado até que um pagamento seja concluído.
        </Alert>
      )}

      {/* ══ Reembolso em análise — sem CTA: o checkout fica bloqueado até o estorno ser concluído ══ */}
      {(awaitingRefund || devShowAwaitingRefund) && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            borderColor: 'warning.main',
            bgcolor: 'warning.soft',
            p: { xs: 3, sm: 4 },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'warning.ink', letterSpacing: '-0.01em' }}>
            Reembolso em análise
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.ink', maxWidth: 560 }}>
            Sua assinatura foi encerrada e o estorno está sendo processado. Assim que ele for
            concluído você poderá assinar um plano novamente. Enquanto isso, seus dados seguem
            disponíveis para exportação na seção de Backup & Dados.
          </Typography>
        </Paper>
      )}

      {/* ══ Downgrade agendado — o plano menor só vale na virada do ciclo já pago ══ */}
      {(subscription.pendingPlanName || devShowPendingPlan) && (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ borderRadius: 3, alignItems: 'center', backgroundColor: "info.soft"}}
          action={
            // Sem isto, quem agenda um downgrade fica preso a ele até a renovação — que pode ser
            // daqui a um ano no plano anual.
            <Button
              disabled={changePlan.isPending}
              sx={{mr: 3}}
              onClick={() => subscription.pendingPlanName && subscription.planId && changePlan.mutate(subscription.planId)}
            >
              Cancelar troca
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Mudança de plano agendada para a próxima renovação</AlertTitle>
          Você passa para o {shortPlanName(subscription.pendingPlanName ?? proMonthly?.name ?? 'Essencial')}{' '}
          {subscription.pendingPlanStartsAt
            ? `em ${formatDate(subscription.pendingPlanStartsAt)}`
            : 'na próxima renovação'}
          . Até lá seu plano atual continua valendo por inteiro — você não perde nada do que já pagou.
        </Alert>
      )}

      {/* ══ Assinatura expirada — troca o banner do plano atual (não vale mais nada) pela grade
          cheia de planos direto na página, sem esconder atrás do PlansDialog ══ */}
      {(isExpired || devShowExpiredGrid) && (
        <Paper
          variant="outlined"
          sx={{ borderRadius: 3, p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
              Sua assinatura expirou
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Escolha um plano para reativar o acesso ao sistema.
            </Typography>
          </Box>
          <PlansGrid plans={plans} onSelectPlan={(plan) => setCheckoutPlan(plan)} />
        </Paper>
      )}

      {/* ══ Banner do plano atual — some quando expirado (ver bloco acima) ══ */}
      {!(isExpired || devShowExpiredGrid) && (
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          p: { xs: 3, sm: 3.5 },
          color: tier.ink,
          background: tier.gradient,
          boxShadow: theme.customShadows.lg,
        }}
      >
        {/* brilho + glifo decorativo */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(130% 130% at 88% -25%, ${alpha(white, 0.35)}, transparent 46%)`,
            pointerEvents: 'none',
          }}
        />
        <tier.Icon
          aria-hidden
          sx={{
            position: 'absolute',
            right: 70,
            bottom: -5,
            fontSize: 120,
            color: tier.glyph,
            transform: 'rotate(-8deg)',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 3 },
            alignItems: { sm: 'center' },
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2.5,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: tier.pillBg,
            }}
          >
            <tier.Icon sx={{ fontSize: 30, color: tier.ink }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: tier.ink, letterSpacing: '-0.02em' }}>
                Plano {planTitle}
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1.25,
                  py: 0.375,
                  borderRadius: 5,
                  bgcolor: tier.pillBg,
                  color: tier.ink,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                {statusLabel}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 0.5, color: tier.inkMuted }}>
              {statusText}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            {currentPlan && !isExpired && (
              <Box sx={{ textAlign: { sm: 'right' } }}>
                <Typography component="span" variant="h5" sx={{ fontWeight: 800, color: tier.ink }}>
                  R$ {formatPrice(currentPlan.price)}
                </Typography>
                <Typography component="span" sx={{ color: tier.inkMuted, fontWeight: 600 }}>
                  {' '}
                  {cycleSuffix(currentCycle)}
                </Typography>
              </Box>
            )}
            {canCancel && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Único caminho para descer de plano (ou trocar a periodicidade) — o upsell só sobe. */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SwapHorizRounded />}
                  onClick={() => setPlansDialogMode('change')}
                  disabled={changePlan.isPending}
                  sx={{
                    backgroundColor: tier.pillBg,
                    color: tier.ink,
                    borderColor: alpha(tier.ink, 0.4),
                    '&:hover': { borderColor: tier.ink, backgroundColor: alpha(tier.ink, 0.08) },
                  }}
                >
                  Trocar de plano
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CancelOutlined />}
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={cancel.isPending}
                  sx={{
                    backgroundColor: tier.pillBg,
                    color: tier.ink,
                    borderColor: alpha(tier.ink, 0.4),
                    '&:hover': { borderColor: tier.ink, backgroundColor: alpha(tier.ink, 0.08) },
                  }}
                >
                  Cancelar plano
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      )}

      {/* ══ Recursos e limites do plano — omitido sem entitlements (Expired/Pending/None não têm
          direito a nada ainda; mostrar o card vazio insinuaria um plano que não vale, ver #4/RF-07.5) ══ */}
      {owned.length > 0 && (
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 3, sm: 4 }, py: 3 }}>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
            O que seu plano inclui
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Recursos e limites ativos no seu plano {planTitle}.
          </Typography>
        </Box>
        <Divider />

        {/* Limites */}
        <Box
          sx={{
            px: { xs: 3, sm: 4 },
            py: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {LIMIT_ORDER.map((k) => {
            const Icon = LIMIT_ICONS[k]
            return (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(checkColor, 0.12),
                    color: checkColor,
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {formatLimit(k, subscription.limits[k])}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {LIMIT_LABELS[k]}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
        <Divider />

        {/* Capacidades */}
        <Box sx={{ px: { xs: 3, sm: 4 }, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.tertiary', fontWeight: 700, letterSpacing: '0.08em' }}
            >
              Módulos
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                columnGap: 3,
                rowGap: 1.25,
              }}
            >
              {includedModules.map((label) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CheckRounded sx={{ fontSize: 18, color: checkColor, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.primary">
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {includedFeatures.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'text.tertiary', fontWeight: 700, letterSpacing: '0.08em' }}
              >
                Recursos avançados
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 3,
                  rowGap: 1.25,
                }}
              >
                {includedFeatures.map((label) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CheckCircleRounded sx={{ fontSize: 18, color: gold[600], flexShrink: 0 }} />
                    <Typography variant="body2" color="text.primary">
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
      )}

      {/* ══ Upsell do Profissional — só para quem ainda não é Pro ══ */}
      {(showUpgrade || devShowUpgrade) && upgradeTarget && (
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 3,
            border: 1,
            borderColor: gold[300],
            color: gold[900],
            background: `linear-gradient(150deg, ${gold[50]} 0%, ${gold[100]} 50%, ${gold[200]} 100%)`,
            boxShadow: theme.customShadows.md,
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(120% 120% at 90% -20%, ${alpha(white, 0.5)}, transparent 45%)`,
              pointerEvents: 'none',
            }}
          />
          <WorkspacePremiumRounded
            aria-hidden
            sx={{
              position: 'absolute',
              right: -18,
              top: -24,
              fontSize: 170,
              color: alpha(gold[500], 0.16),
              transform: 'rotate(12deg)',
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ position: 'relative', p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
              component="span"
              sx={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.625,
                px: 1.25,
                py: 0.5,
                borderRadius: 5,
                bgcolor: gold[900],
                color: gold[50],
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              <AutoAwesomeRounded sx={{ fontSize: 14 }} />
              PROFISSIONAL
            </Box>

            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: gold[900] }}>
                Desbloqueie tudo o que sua loja pode ser
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, color: alpha(gold[900], 0.8), maxWidth: 540 }}>
                Passe para o Profissional e libere {newFeatures.length} recursos avançados, com limites
                muito maiores para crescer sem travas.
              </Typography>
            </Box>

            {/* Preço + período */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography component="span" variant="h3" sx={{ fontWeight: 800, color: gold[900], letterSpacing: '-0.02em' }}>
                    R$ {formatPrice(upgradeTarget.price)}
                  </Typography>
                  <Typography component="span" variant="h6" sx={{ color: alpha(gold[900], 0.7), fontWeight: 600 }}>
                    {cycleSuffix(cycle)}
                  </Typography>
                </Box>
                {cycle === 'annual' && annualSavings > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5, color: gold[800], fontWeight: 600 }}>
                    No plano anual você economiza 2 meses.
                  </Typography>
                )}
              </Box>

              {proMonthly && proAnnual && (
                <Box
                  role="group"
                  aria-label="Período de cobrança"
                  sx={{
                    display: 'inline-flex',
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: 5,
                    bgcolor: alpha(gold[900], 0.06),
                    border: 1,
                    borderColor: alpha(gold[900], 0.12),
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
                          px: 2,
                          py: 0.875,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          fontFamily: 'inherit',
                          fontWeight: 700,
                          fontSize: 13,
                          bgcolor: active ? gold[900] : 'transparent',
                          color: active ? gold[50] : alpha(gold[900], 0.75),
                          transition: 'background-color 0.15s, color 0.15s',
                          '&:hover': { color: active ? gold[50] : gold[900] },
                          '&:focus-visible': { outline: `2px solid ${gold[600]}`, outlineOffset: 2 },
                        }}
                      >
                        {c === 'monthly' ? 'Mensal' : 'Anual'}
                        {c === 'annual' && annualSavings > 0 && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 5,
                              bgcolor: active ? alpha(gold[50], 0.22) : gold[500],
                              color: active ? gold[50] : gold[900],
                            }}
                          >
                            2 MESES GRÁTIS
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>

            <Divider sx={{ borderColor: alpha(gold[900], 0.12) }} />

            {/* Novos recursos */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: alpha(gold[900], 0.65), fontWeight: 700, letterSpacing: '0.08em' }}
              >
                Você também passa a ter
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 3,
                  rowGap: 1.25,
                }}
              >
                {newFeatures.map((label) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CheckCircleRounded sx={{ fontSize: 18, color: gold[600], flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: gold[900] }}>
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Destaques de limite */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {upgradeLimits.map(({ icon: Icon, text }) => (
                <Box
                  key={text}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 5,
                    bgcolor: alpha(gold[900], 0.06),
                    border: 1,
                    borderColor: alpha(gold[900], 0.12),
                    color: gold[900],
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                  {text}
                </Box>
              ))}
            </Box>

            {/* CTA */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                gap: 1.5,
              }}
            >
              <Button
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                onClick={() => askToChangePlan(upgradeTarget)}
                disabled={changePlan.isPending}
                sx={{
                  px: 3,
                  py: 1.25,
                  fontWeight: 700,
                  bgcolor: gold[900],
                  color: gold[50],
                  boxShadow: theme.customShadows.md,
                  transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.15s',
                  '&:hover': {
                    bgcolor: gold[800],
                    transform: 'translateY(-1px)',
                    boxShadow: theme.customShadows.lg,
                  },
                }}
              >
                {ctaLabel}
              </Button>
              <Typography variant="caption" sx={{ color: alpha(gold[900], 0.7) }}>
                {isLiveCard
                  ? 'Upgrade imediato — o novo valor entra só na próxima renovação.'
                  : 'Cobrança recorrente. Cancele quando quiser.'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ══ Reassinar / reativar — quando não há assinatura viva ══ */}
      {(showResubscribe || devShowResubscribe) && resubscribeTarget && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            borderColor: brand[300],
            background: `linear-gradient(150deg, ${brand[50]} 0%, ${brand[100]} 100%)`,
            p: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
            gap: 2.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: brand[900], letterSpacing: '-0.01em' }}>
              {isPendingCheckout
                ? 'Finalize sua assinatura'
                : hasRemainingAccess
                  ? 'Reative sua assinatura'
                  : 'Assine para continuar usando'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: alpha(brand[900], 0.8), maxWidth: 560 }}>
              {isPendingCheckout
                ? 'Seu último pagamento não foi concluído. Tente novamente para ativar seu plano.'
                : hasRemainingAccess
                  ? `Sua assinatura foi cancelada, mas você ainda tem acesso${
                      statusLine?.date ? ` até ${statusLine.date}` : ''
                    }. Reativar agora gera uma nova cobrança imediata.`
                  : 'Sua assinatura não está ativa. Escolha um plano para voltar a usar o sistema.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            endIcon={<ArrowForwardRounded />}
            onClick={() => setPlansDialogMode('checkout')}
            sx={{ flexShrink: 0, px: 3, py: 1.25, fontWeight: 700 }}
          >
            {isPendingCheckout ? 'Tentar novamente' : hasRemainingAccess ? 'Reativar assinatura' : 'Assinar agora'}
          </Button>
        </Paper>
      )}

      {/* ══ Histórico de cobranças (ex-aba Faturas) ══ */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Histórico de cobranças
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Pagamentos realizados na sua assinatura
          </Typography>
        </Box>
        <Divider />
        {loadingPayments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <DataGrid
            rows={payments}
            columns={paymentColumns}
            rowHeight={72}
            autoHeight
            disableColumnMenu
            disableRowSelectionOnClick
            getRowClassName={({ row }) => (row.receiptUrl ? 'has-receipt' : '')}
            onRowClick={({ row }) => {
              if (row.receiptUrl) window.open(row.receiptUrl, '_blank', 'noopener,noreferrer')
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
            sx={{
              border: 0,
              borderRadius: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.paper' },
              '& .has-receipt': { cursor: 'pointer' },
              '& .has-receipt:hover': { bgcolor: 'surface.raised' },
            }}
          />
        )}
      </Paper>

      <PlansDialog
        open={plansDialogMode !== null}
        mode={plansDialogMode ?? 'checkout'}
        currentPlanId={subscription.planId}
        plans={plans}
        onClose={() => setPlansDialogMode(null)}
        onSelectPlan={(plan) => {
          const mode = plansDialogMode
          setPlansDialogMode(null)
          if (mode === 'change') askToChangePlan(plan)
          else setCheckoutPlan(plan)
        }}
      />

      <PlanCheckoutDialog
        open={checkoutPlan !== null}
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancelar assinatura?"
        description={cancelDescription}
        acknowledgmentLabel={"Confirmo que li a mensagem e desejo prosseguir para o cancelamento"}
        confirmLabel="Cancelar assinatura"
        pendingLabel="Cancelando..."
        isPending={cancel.isPending}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        danger={isTrial || inRefundWindow}
        requireAcknowledgment
      />

      <ConfirmDialog
        open={changeTarget !== null}
        title={`Mudar para o ${changeTarget ? shortPlanName(changeTarget.name) : 'novo plano'}?`}
        description={changeDescription}
        confirmLabel={changeIsScheduled ? 'Agendar troca' : 'Mudar de plano'}
        pendingLabel="Alterando..."
        isPending={changePlan.isPending}
        // Espera a simulação chegar antes de deixar confirmar — o usuário precisa ver o valor primeiro.
        confirmDisabled={previewLoading}
        onClose={() => setChangeTarget(null)}
        onConfirm={handleConfirmChange}
        danger={changeIsScheduled && lostFeatures.length > 0}
        requireAcknowledgment={!isTrial && !changeIsScheduled}
        acknowledgmentLabel="Entendo que a cobrança acima é feita agora e desejo continuar."
      />
    </Box>
  )
}
