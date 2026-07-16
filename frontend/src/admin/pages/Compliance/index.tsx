import { useMemo, useState } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { DeleteForeverOutlined, GavelOutlined, StorefrontOutlined, VpnKeyOutlined } from '@mui/icons-material'
import PageHeader from '../../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import { useAdminAccessLogs, useAdminAccountDeletions, useAdminRetentionTenants } from '../../hooks/useAdmin'
import DeletionsGrid from './components/DeletionsGrid'
import RetentionTenantsGrid from './components/RetentionTenantsGrid'
import AccessLogsGrid from './components/AccessLogsGrid'

export default function AdminCompliancePage() {
  const [tab, setTab] = useState(0)

  const { data: deletions = [], isLoading: loadingDeletions } = useAdminAccountDeletions()
  const { data: tenants = [], isLoading: loadingTenants } = useAdminRetentionTenants()
  const { data: accessLogs, isLoading: loadingAccess } = useAdminAccessLogs()

  const kpis = useMemo(
    () => ({
      // Pedidos ainda em carência — os reversíveis, que exigem atenção.
      pending: deletions.filter((d) => d.status === 'Requested').length,
      effected: deletions.filter((d) => d.status === 'Effected').length,
      scheduled: tenants.filter((t) => t.scheduledDeletionAt !== null).length,
      legalHold: tenants.filter((t) => t.scheduledDeletionAt === null && t.legalHoldUntil !== null).length,
    }),
    [deletions, tenants],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Conformidade"
        description="Exclusões de conta e loja (LGPD), pipeline de retenção e registros de acesso."
        showHelp={false}
      />

      <PageKpiGrid>
        <PageKpiCard
          icon={DeleteForeverOutlined}
          label="Exclusões em carência"
          value={kpis.pending}
          valueColor={kpis.pending > 0 ? 'warning' : undefined}
          isLoading={loadingDeletions}
          tooltip="Pedidos ainda reversíveis — o titular pode cancelar até o prazo vencer."
        />
        <PageKpiCard
          icon={GavelOutlined}
          label="Exclusões efetivadas"
          value={kpis.effected}
          isLoading={loadingDeletions}
          tooltip="Pipeline já rodou: dados sem base legal apagados, o resto em guarda fiscal."
        />
        <PageKpiCard
          icon={StorefrontOutlined}
          label="Lojas agendadas"
          value={kpis.scheduled}
          valueColor={kpis.scheduled > 0 ? 'warning' : undefined}
          isLoading={loadingTenants}
          tooltip="Lojas com exclusão agendada — por pedido ou por perda de acesso (retenção de 90 dias)."
        />
        <PageKpiCard
          icon={VpnKeyOutlined}
          label="Registros de acesso"
          value={accessLogs?.totalCount ?? 0}
          isLoading={loadingAccess}
          tooltip="Marco Civil art. 15 — guarda mínima de 6 meses."
        />
      </PageKpiGrid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
          <Tab label="Exclusões" />
          <Tab label="Lojas em retenção" />
          <Tab label="Acessos" />
        </Tabs>
      </Box>

      {tab === 0 && <DeletionsGrid />}
      {tab === 1 && <RetentionTenantsGrid />}
      {tab === 2 && <AccessLogsGrid />}
    </Box>
  )
}
