import { Alert, Box, useTheme } from '@mui/material'
import {
  AccountBalanceWalletOutlined,
  GroupOutlined,
  PaidOutlined,
  ReceiptLongOutlined,
  StorefrontOutlined,
  TrendingUpRounded,
  WorkspacePremiumOutlined,
} from '@mui/icons-material'
import { LineChart } from '@mui/x-charts/LineChart'
import dayjs from 'dayjs'
import PageHeader from '../../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import ChartCard from '../../../components/ChartCard'
import DonutChart from '../../../components/DonutChart'
import { formatCents } from '../../../utils/currency'
import { useAdminOverview } from '../../hooks/useAdmin'

const DONUT_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#a855f7', '#ec4899', '#64748b']

function monthLabel(month: string): string {
  return dayjs(`${month}-01`).format('MMM/YY')
}

export default function AdminOverviewPage() {
  const theme = useTheme()
  const { data, isLoading } = useAdminOverview()

  const revenueSeries = data?.revenueByMonth ?? []
  const labels = revenueSeries.map((p) => monthLabel(p.month))
  const revenueReais = revenueSeries.map((p) => p.revenueCents / 100)

  const donutSegments = (data?.planDistribution ?? []).map((p, i) => ({
    label: p.planName,
    value: p.activeCount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  // Alertas — só entram os que têm ocorrência. Mensagens em pt-BR moram aqui, no frontend.
  const alerts: { key: string; severity: 'error' | 'warning' | 'info'; message: string }[] = []
  if (data) {
    if (data.webhookFailures24h > 0)
      alerts.push({
        key: 'webhooks',
        severity: 'error',
        message: `${data.webhookFailures24h} webhook(s) com falha nas últimas 24h — verifique a integração do gateway.`,
      })
    if (data.pastDueSubscriptions > 0)
      alerts.push({
        key: 'pastdue',
        severity: 'warning',
        message: `${data.pastDueSubscriptions} assinatura(s) ativa(s) com período vencido — a renovação falhou e o acesso caiu.`,
      })
    if (data.activePlansMissingGateway > 0)
      alerts.push({
        key: 'plans',
        severity: 'warning',
        message: `${data.activePlansMissingGateway} plano(s) ativo(s) sem produto configurado no gateway.`,
      })
    if (data.accountsInDeletion > 0)
      alerts.push({
        key: 'deletion',
        severity: 'info',
        message: `${data.accountsInDeletion} conta(s) em processo de exclusão (LGPD).`,
      })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Visão geral"
        description="Métricas da plataforma — assinaturas, receita e saúde do billing."
        showHelp={false}
      />

      {alerts.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {alerts.map((a) => (
            <Alert key={a.key} severity={a.severity} variant="outlined">
              {a.message}
            </Alert>
          ))}
        </Box>
      )}

      <PageKpiGrid>
        <PageKpiCard
          icon={AccountBalanceWalletOutlined}
          label="MRR"
          value={formatCents(data?.mrrCents ?? 0)}
          isLoading={isLoading}
          tooltip="Receita recorrente mensal — assinaturas ativas (anual normalizado por 12)."
          badge={{ label: `${formatCents(data?.arrCents ?? 0)}/ano`, color: 'success', icon: TrendingUpRounded }}
        />
        <PageKpiCard
          icon={WorkspacePremiumOutlined}
          label="Assinaturas ativas"
          value={data?.activeSubscriptions ?? 0}
          isLoading={isLoading}
          badge={{ label: `${data?.trialingSubscriptions ?? 0} em trial`, color: 'info' }}
        />
        <PageKpiCard
          icon={PaidOutlined}
          label="Receita do mês"
          value={formatCents(data?.monthRevenueCents ?? 0)}
          isLoading={isLoading}
          tooltip="Soma das cobranças pagas no mês corrente."
        />
        <PageKpiCard
          icon={ReceiptLongOutlined}
          label="Cobranças falhas"
          value={data?.failedPaymentsCount ?? 0}
          valueColor={data && data.failedPaymentsCount > 0 ? 'error' : undefined}
          isLoading={isLoading}
          tooltip="Cobranças recusadas (dunning)."
        />
      </PageKpiGrid>

      <PageKpiGrid>
        <PageKpiCard icon={StorefrontOutlined} label="Lojas ativas" value={data?.totalTenants ?? 0} isLoading={isLoading} />
        <PageKpiCard icon={GroupOutlined} label="Usuários" value={data?.totalUsers ?? 0} isLoading={isLoading} />
        <PageKpiCard
          icon={WorkspacePremiumOutlined}
          label="Canceladas / expiradas"
          value={(data?.canceledSubscriptions ?? 0) + (data?.expiredSubscriptions ?? 0)}
          isLoading={isLoading}
          tooltip="Churn acumulado — assinaturas canceladas e expiradas."
        />
        <PageKpiCard
          icon={PaidOutlined}
          label="Estornado no mês"
          value={formatCents(data?.monthRefundedCents ?? 0)}
          isLoading={isLoading}
        />
      </PageKpiGrid>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <ChartCard
          title="Receita"
          subtitle="Últimos 6 meses"
          loading={isLoading}
          isEmpty={revenueReais.every((v) => v === 0)}
        >
          <LineChart
            height={300}
            xAxis={[{ scaleType: 'point', data: labels }]}
            yAxis={[{ valueFormatter: (v: number | null) => formatCents((v ?? 0) * 100) }]}
            series={[
              {
                data: revenueReais,
                label: 'Receita',
                color: theme.palette.success.main,
                area: true,
                showMark: false,
                valueFormatter: (v) => formatCents((v ?? 0) * 100),
              },
            ]}
            margin={{ left: 16 }}
            sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.15 } }}
          />
        </ChartCard>

        <DonutChart
          title="Assinaturas ativas por plano"
          loading={isLoading}
          segments={donutSegments}
          showTotal
          totalLabel="Ativas"
          valueFormatter={(v) => String(v)}
          emptyText="Nenhuma assinatura ativa."
        />
      </Box>
    </Box>
  )
}
