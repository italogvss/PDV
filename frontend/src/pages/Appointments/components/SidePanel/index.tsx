import SpaOutlined from '@mui/icons-material/SpaOutlined'
import type { Theme } from '@mui/material'
import { Box, Card, CardContent, Tooltip, Typography, useTheme } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import {
  computeKpis,
  firstName,
  formatHM,
  STATUS_META,
  type StatusTone,
  upcomingForDay
} from '../appointmentHelpers'
import type { SidePanelProps } from './types'

function toneHex(theme: Theme, tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return theme.palette.success.main
    case 'warning':
      return theme.palette.warning.main
    case 'info':
      return theme.palette.info.main
    case 'error':
      return theme.palette.error.main
    default:
      return theme.palette.text.disabled
  }
}

export default function SidePanel({
  appointments,
  professionals,
  selectedDate,
  isToday,
  onOpenDetail,
}: SidePanelProps) {
  const theme = useTheme()
  const kpis = computeKpis(appointments, selectedDate)

  const upcoming = upcomingForDay(appointments, selectedDate, isToday)
  const proById = (id: string) => professionals.find((p) => p.id === id)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Resumo do dia */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Resumo do dia
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>

            <SummaryBlock title="Horários" label="Quantidade de agendamentos hoje" value={String(kpis.count)} />
            <SummaryBlock title="Receita Prevista" label="Receita prevista para hoje" value={formatBRL(kpis.revenue)} />
            <SummaryBlock title="Confirmados" label="Agendamentos confirmados" value={String(kpis.confirmados)} tone="success.main" />
            <SummaryBlock title="A confirmar" label="Agendamentos a confirmar" value={String(kpis.pendentes)} tone="warning.main" />
          </Box>
        </CardContent>
      </Card>

      {/* A seguir / Agenda do dia */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            {isToday ? 'A seguir' : 'Agenda do dia'}
          </Typography>
          {upcoming.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.disabled' }}>
              <SpaOutlined sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Nada mais por hoje
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {upcoming.map((appt) => {
                const pro = appt.employeeId ? proById(appt.employeeId) : undefined
                const proName = pro?.name ?? appt.employeeName
                const meta = STATUS_META[appt.status]
                return (
                  <Box
                    key={appt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenDetail(appt.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onOpenDetail(appt.id)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      px: 3,
                      py: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'surface.sunken' },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, width: 38, color: 'text.secondary' }}
                    >
                      {formatHM(appt.start)}
                    </Typography>
                    <Box
                      sx={{
                        width: 3,
                        alignSelf: 'stretch',
                        borderRadius: 2,
                        bgcolor: appt.color ?? "secondary.main",
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {appt.services.map((s) => s.name).join(' + ')}
                      </Typography>
                      <Typography variant="caption" color="text.tertiary">
                        {firstName(appt.customerName)}
                        {proName ? ` · ${firstName(proName)}` : ''}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: toneHex(theme, meta.tone),
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                )
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

function SummaryBlock({ label, value, tone, title }: { title: string, label: string; value: string; tone?: string }) {
  return (
    <Tooltip title={label}>
    <Box sx={{ py: 1.25, px: 2, borderRadius: 1, bgcolor: 'surface.sunken' }}>
      <Typography variant="caption" color="text.tertiary" sx={{ display: 'block' }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 600, color: tone ?? 'text.primary' }}>
        {value}
      </Typography>
    </Box>
    </Tooltip>
  )
}
