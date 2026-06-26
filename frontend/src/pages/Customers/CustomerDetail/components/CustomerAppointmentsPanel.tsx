import { CalendarMonthOutlined } from '@mui/icons-material'
import { Avatar, Box, Card, Chip, Divider, Skeleton, Typography } from '@mui/material'
import type { CustomerCrmStats } from '../../../../services/customer.service'
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, formatAppointmentDate, getInitials } from './helpers'

interface Props {
  stats: CustomerCrmStats | undefined
  statsLoading: boolean
}

export default function CustomerAppointmentsPanel({ stats, statsLoading }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Próximo agendamento</Typography>
          {stats?.nextAppointment && (
            <Chip
              size="small"
              color={APPOINTMENT_STATUS_COLORS[stats.nextAppointment.status] ?? 'default'}
              label={APPOINTMENT_STATUS_LABELS[stats.nextAppointment.status] ?? stats.nextAppointment.status}
            />
          )}
        </Box>
        <Divider />
        <Box sx={{ px: 3, py: 2.5 }}>
          {statsLoading ? (
            <Skeleton variant="rounded" height={60} />
          ) : stats?.nextAppointment ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'success.soft',
                  border: '1px solid',
                  borderColor: 'success.main',
                  opacity: 0.8,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CalendarMonthOutlined sx={{ fontSize: 18, color: 'common.white' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {stats.nextAppointment.serviceNames.join(', ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatAppointmentDate(stats.nextAppointment.start)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>
                  {getInitials(stats.nextAppointment.employeeName)}
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  {stats.nextAppointment.employeeName}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">Sem agendamentos futuros</Typography>
          )}
        </Box>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Atendimentos</Typography>
          {stats && (
            <Chip
              size="small"
              label={`${stats.appointmentCounts.total}×`}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <Divider />
        {statsLoading ? (
          <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={80} /></Box>
        ) : stats ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
              <CountBox label="TOTAL" value={stats.appointmentCounts.total} />
              <CountBox
                label="CONCLUÍDOS"
                value={stats.appointmentCounts.completed}
                color="success.main"
                bg="success.soft"
                borderLeft
              />
              <CountBox
                label="CANCELADOS"
                value={stats.appointmentCounts.cancelled}
                color="error.main"
                bg="error.soft"
                borderLeft
              />
            </Box>

            {stats.topServices.length > 0 && (
              <Box sx={{ px: 3, py: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                  Serviços mais agendados
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {stats.topServices.map((s) => (
                    <Box key={s.serviceName}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{s.serviceName}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.count}×</Typography>
                      </Box>
                      <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            borderRadius: 2,
                            bgcolor: 'error.main',
                            width: `${(s.count / s.maxCount) * 100}%`,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        ) : null}
      </Card>

    </Box>
  )
}

function CountBox({
  label,
  value,
  color,
  bg,
  borderLeft,
}: {
  label: string
  value: number
  color?: string
  bg?: string
  borderLeft?: boolean
}) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        textAlign: 'center',
        bgcolor: bg ?? 'transparent',
        ...(borderLeft && { borderLeft: '1px solid', borderColor: 'divider' }),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ mt: 0.5, color: color ?? 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}
