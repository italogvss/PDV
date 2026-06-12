import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { Theme } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import CheckRounded from '@mui/icons-material/CheckRounded'
import BoltRounded from '@mui/icons-material/BoltRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import PaletteRounded from '@mui/icons-material/PaletteRounded'
import dayjs from 'dayjs'
import { formatBRL } from '../../../../utils/currency'
import {
  STATUS_META,
  type StatusTone,
  formatRange,
  initialsOf,
  proColorKey,
  type ProColorKey,
} from '../appointmentHelpers'
import type { AppointmentDetailModalProps } from './types'

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const APPOINTMENT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

function proHex(theme: Theme, id: string): string {
  const key: ProColorKey = proColorKey(id)
  return key === 'green' ? theme.palette.success.main : theme.palette.data[key].main
}

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
  onChangeColor,
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
  const color = data.color || proHex(theme, data.employeeId)
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
      {/* Hero */}
      <Box sx={{ position: 'relative', p: 3, pb: 2 }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', pr: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
              {initialsOf(data.customerName)}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h3" sx={{ fontWeight: 600 }}>
              {data.customerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.services.map((s) => s.name).join(' + ')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Chip size="small" label={meta.label} sx={{ fontWeight: 600, ...toneSx(meta.tone) }} />
          {professional && (
            <Chip
              size="small"
              variant="outlined"
              label={professional.name}
              avatar={
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: color,
                  }}
                />
              }
            />
          )}
        </Box>
      </Box>

      <Divider />

      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          <Detail label="Data" value={`${DOW_SHORT[start.day()]}, ${start.format('DD/MM')}`} />
          <Detail
            label="Horário"
            value={formatRange(data.start, data.durationMinutes)}
          />
          <Detail label="Duração" value={`${data.durationMinutes} min`} />
          <Detail label="Valor" value={formatBRL(data.price)} />
        </Box>

        {data.customerPhone && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.tertiary" sx={{ display: 'block' }}>
                Contato
              </Typography>
              <Typography variant="body2">{data.customerPhone}</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<WhatsApp />}
              component="a"
              href={`https://wa.me/55${waDigits}`}
              target="_blank"
              rel="noopener"
            >
              WhatsApp
            </Button>
          </Box>
        )}

        {data.note && (
          <Box
            sx={{
              mt: 2,
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

        {!isClosed && onChangeColor && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.tertiary" sx={{ display: 'block', mb: 0.75 }}>
              Cor do agendamento
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box
                role="button"
                tabIndex={0}
                onClick={() => onChangeColor(data.id, '')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChangeColor(data.id, '') }}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: !data.color ? 'text.primary' : 'border.subtle',
                  bgcolor: 'surface.sunken',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!data.color && (
                  <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
                    —
                  </Typography>
                )}
              </Box>
              {APPOINTMENT_COLORS.map((c) => (
                <Box
                  key={c}
                  role="button"
                  tabIndex={0}
                  onClick={() => onChangeColor(data.id, c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChangeColor(data.id, c) }}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: data.color === c ? 'text.primary' : 'transparent',
                    outline: data.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transition: 'outline 0.15s',
                  }}
                />
              ))}
              {(() => {
                const isCustom = !!data.color && !APPOINTMENT_COLORS.includes(data.color)
                return (
                  <Box
                    component="label"
                    title="Cor personalizada"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: isCustom ? 'text.primary' : 'border.subtle',
                      outline: isCustom ? `2px solid ${data.color}` : 'none',
                      outlineOffset: '2px',
                      bgcolor: isCustom ? data.color : 'surface.sunken',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'outline 0.15s',
                    }}
                  >
                    <input
                      type="color"
                      value={data.color || '#000000'}
                      onChange={(e) => onChangeColor(data.id, e.target.value)}
                      style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                    {!isCustom && (
                      <PaletteRounded sx={{ fontSize: 12, color: 'text.secondary', pointerEvents: 'none' }} />
                    )}
                  </Box>
                )
              })()}
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      {/* Rodapé — ações por status */}
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
                color="error"
                size="small"
                onClick={() => onChangeStatus(data.id, 'cancelado')}
              >
                Sim, cancelar
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {isClosed ? (
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  color="error"
                  onClick={() => setConfirmingCancel(true)}
                  sx={{ mr: 'auto' }}
                >
                  Cancelar
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.tertiary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  )
}
