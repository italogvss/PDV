import { Box, Card, CardContent, Chip, Typography, useTheme } from '@mui/material'
import type { Theme } from '@mui/material'
import dayjs from 'dayjs'
import SpaOutlined from '@mui/icons-material/SpaOutlined'
import { formatBRL } from '../../../../utils/currency'
import {
  STATUS_META,
  type StatusTone,
  bookedMinutesForPro,
  computeKpis,
  firstName,
  formatHM,
  initialsOf,
  proColorKey,
  type ProColorKey,
  upcomingForDay,
} from '../appointmentHelpers'
import type { SidePanelProps } from './types'

function proHex(theme: Theme, id: string): string {
  const key: ProColorKey = proColorKey(id)
  return key === 'green' ? theme.palette.success.main : theme.palette.data[key].main
}

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
            <SummaryBlock label="Horários" value={String(kpis.count)} />
            <SummaryBlock label="Receita" value={formatBRL(kpis.revenue)} />
            <SummaryBlock label="Confirmados" value={String(kpis.confirmados)} tone="success.main" />
            <SummaryBlock label="A confirmar" value={String(kpis.pendentes)} tone="warning.main" />
          </Box>
        </CardContent>
      </Card>

      {/* Equipe */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Equipe
            </Typography>
            <Chip size="small" label={`${professionals.length} profissionais`} variant="outlined" />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {professionals.map((pro) => {
              const booked = bookedMinutesForPro(appointments, pro.id, selectedDate)
              const color = proHex(theme, pro.id)
              return (
                <Box key={pro.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar name={pro.name} color={color} />
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {firstName(pro.name)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(booked / 60).toFixed(booked % 60 === 0 ? 0 : 1)}h
                  </Typography>
                </Box>
              )
            })}
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
                const accentColor = appt.employeeId ? proHex(theme, appt.employeeId) : theme.palette.text.disabled
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
                      p: 1,
                      borderRadius: 1.5,
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
                        bgcolor:  appt.color ?? "secondary.main",
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

function SummaryBlock({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Box sx={{ py: 1.25, px: 2, borderRadius: 1, bgcolor: 'surface.sunken' }}>
      <Typography variant="caption" color="text.tertiary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 600, color: tone ?? 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        bgcolor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
        {initialsOf(name)}
      </Typography>
    </Box>
  )
}
