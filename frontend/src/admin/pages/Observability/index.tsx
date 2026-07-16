import { useState } from 'react'
import { Box, Card, CardContent, Skeleton, Tab, Tabs, Typography } from '@mui/material'
import { CircleRounded } from '@mui/icons-material'
import PageHeader from '../../../components/PageHeader'
import StatusChip from '../../components/StatusChip'
import { HEALTH_STATUS, metaFor } from '../../constants/statusMeta'
import { useAdminHealth } from '../../hooks/useAdmin'
import SystemLogsGrid from './components/SystemLogsGrid'
import PlatformEventsGrid from './components/PlatformEventsGrid'

// Nomes técnicos dos checks → rótulo humano.
const CHECK_LABEL: Record<string, string> = {
  mysql: 'Banco de dados (MySQL)',
  storage: 'Storage (MinIO/S3)',
}

const DOT_COLOR: Record<string, string> = {
  Healthy: 'success.main',
  Degraded: 'warning.main',
  Unhealthy: 'error.main',
}

function HealthPanel() {
  const { data, isLoading } = useAdminHealth()

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={96} />
      </Box>
    )
  }

  if (!data) return null

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
      <Card>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.tertiary' }}>
            Status geral da API
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <CircleRounded sx={{ fontSize: 12, color: DOT_COLOR[data.status] ?? 'text.disabled' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {metaFor(HEALTH_STATUS, data.status).label}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.tertiary">
            verificado em {data.totalDurationMs.toFixed(0)} ms
          </Typography>
        </CardContent>
      </Card>

      {data.entries.map((entry) => (
        <Card key={entry.name}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'text.tertiary' }}>
              {CHECK_LABEL[entry.name] ?? entry.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 0.5 }}>
              <StatusChip map={HEALTH_STATUS} value={entry.status} />
              <Typography variant="caption" color="text.tertiary">
                {entry.durationMs.toFixed(0)} ms
              </Typography>
            </Box>
            {entry.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {entry.description}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export default function AdminObservabilityPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Observabilidade"
        description="Saúde da API, logs do sistema e o que está acontecendo na plataforma."
        showHelp={false}
      />

      <HealthPanel />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
          <Tab label="Logs do sistema" />
          <Tab label="Atividade da plataforma" />
        </Tabs>
      </Box>

      {tab === 0 ? <SystemLogsGrid /> : <PlatformEventsGrid />}
    </Box>
  )
}
