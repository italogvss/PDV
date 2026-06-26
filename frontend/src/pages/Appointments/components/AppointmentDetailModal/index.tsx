import BoltRounded from '@mui/icons-material/BoltRounded'
import CancelRounded from '@mui/icons-material/CancelRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import ModalHeader from '../../../../components/ModalHeader'
import { formatBRL } from '../../../../utils/currency'
import {
  formatRange,
  STATUS_COLOR,
  STATUS_META,
  type StatusTone,
} from '../appointmentHelpers'
import type { AppointmentDetailModalProps } from './types'

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toneSx(tone: StatusTone) {
  if (tone === 'neutral') return { bgcolor: 'surface.raised', color: 'text.secondary' }
  return { bgcolor: `${tone}.soft`, color: `${tone}.ink` }
}

export default function AppointmentDetailModal({
  open,
  appointment,
  professional,
  onClose,
  onChangeStatus,
}: AppointmentDetailModalProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cached, setCached] = useState(appointment)

  useEffect(() => {
    if (appointment) setCached(appointment)
  }, [appointment])

  useEffect(() => {
    if (open) setConfirmingCancel(false)
  }, [open, appointment?.id])

  const data = appointment ?? cached

  if (!data) return null

  const meta = STATUS_META[data.status]
  const color = theme.palette[STATUS_COLOR[data.status]].main
  const start = dayjs(data.start)
  const isClosed = data.status === 'concluido' || data.status === 'cancelado'
  const waDigits = data.customerPhone?.replace(/\D/g, '')

  const advance = (() => {
    switch (data.status) {
      case 'pendente':
        return { label: 'Confirmar', icon: <CheckRounded />, next: 'confirmado' as const }
      case 'confirmado':
        return { label: 'Iniciar', icon: <BoltRounded />, next: 'em_atendimento' as const }
      case 'em_atendimento':
        return { label: 'Concluir', icon: <DoneAllRounded />, next: 'concluido' as const }
      default:
        return null
    }
  })()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={data.customerName}
        subtitle={data.services.map((s) => s.name).join(' + ')}
        onClose={onClose}
      />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, color: 'text.secondary' }}>

          <Box
            sx={{
              backgroundColor: 'surface.sunken',
              border: '1px solid',
              borderColor: 'border.strong',
              px: 2,
              py: 2,
              borderRadius: 2,
            }}
          >
            {/* Lista de serviços */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Serviços
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {data.services.map((s) => (
                  <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 2 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                      {formatBRL(s.price)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Resumo */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Divider sx={{ mb: 1, borderColor: 'border.strong', borderStyle: 'dashed' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Data</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {`${DOW_SHORT[start.day()]}, ${start.format('DD/MM')}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Horário</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatRange(data.start, data.durationMinutes)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Duração</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.durationMinutes} min</Typography>
              </Box>
              <Divider sx={{ my: 0.5, borderColor: 'border.strong', borderStyle: 'dashed' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Total</Typography>
                <Typography variant="h3" sx={{ color: 'text.primary' }}>{formatBRL(data.price)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Status e profissional */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={meta.label} sx={{ fontWeight: 600, ...toneSx(meta.tone) }} />
            {professional && (
              <Chip
                size="small"
                variant="outlined"
                label={professional.name}
                avatar={
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: color }} />
                }
              />
            )}
          </Box>

          {/* Contato */}
          {data.customerPhone && (
            <Box>
              <Typography variant="caption" color="text.tertiary" sx={{ display: 'block' }}>
                Contato
              </Typography>
              <Typography variant="body2">{data.customerPhone}</Typography>
            </Box>
          )}

          {/* Observação */}
          {data.note && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'warning.soft',
                color: 'warning.ink',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                Observação
              </Typography>
              <Typography variant="body2">{data.note}</Typography>
            </Box>
          )}

        </Box>
      </DialogContent>

      <Divider />

      <Box sx={{ p: 2 }}>
        {confirmingCancel ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Cancelar este agendamento?
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="small" onClick={() => setConfirmingCancel(false)}>
                Voltar
              </Button>
              <Button
                variant="contained"
                sx={{backgroundColor: "error.main"}}
                onClick={() => onChangeStatus(data.id, 'cancelado')}
              >
                Sim, cancelar
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isClosed ? (
              <Button variant="ghost" onClick={onClose} sx={{ ml: 'auto' }}>
                Fechar
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  sx={{"&:hover":{color: "error.main"}}}       
                  startIcon={<CancelRounded />}
                  onClick={() => setConfirmingCancel(true)}
                >
                  Cancelar
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button
                  variant="outlined"
                  component={data.customerPhone ? 'a' : 'button'}
                  href={data.customerPhone ? `https://wa.me/55${waDigits}` : undefined}
                  target={data.customerPhone ? '_blank' : undefined}
                  rel={data.customerPhone ? 'noopener' : undefined}
                  disabled={!data.customerPhone}
                  startIcon={<WhatsApp />}
                  color="success"
                >
                  WhatsApp
                </Button>
                {advance && (
                  <Button
                    variant="contained"
                    startIcon={advance.icon}
                    onClick={() => onChangeStatus(data.id, advance.next)}
                  >
                    {advance.label}
                  </Button>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Dialog>
  )
}
