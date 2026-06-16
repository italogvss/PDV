import { useEffect, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Divider, Paper, Switch, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import {
  useUpdateNotificationSettings,
  useUserSettings,
} from '../../../../hooks/useUserSettings'
import type { NotificationPrefs } from '../../../../types/usersettings.type'

const EVENTS: { key: keyof NotificationPrefs; label: string; sublabel: string }[] = [
  //{ key: 'newSales', label: 'Novas vendas', sublabel: 'Cada pedido finalizado' },
  { key: 'stockAlerts', label: 'Alertas de estoque', sublabel: 'Produtos abaixo do mínimo' },
  { key: 'invoices', label: 'Contas e faturas', sublabel: 'Vencimentos e cobranças' },
  {
    key: 'teamActivity',
    label: 'Atividade da equipe',
    sublabel: 'Funcionários batem ponto, fechamento de caixa',
  },
]

export default function NotificationsSection() {
  const { data, isLoading } = useUserSettings()
  const update = useUpdateNotificationSettings()
  const [form, setForm] = useState<NotificationPrefs | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setForm(data.notifications)
      initialized.current = true
    }
  }, [data])

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const toggle = (key: keyof NotificationPrefs) =>
    setForm((f) => (f ? { ...f, [key]: !f[key] } : f))

  const hasChanges =
    !!data && EVENTS.some((e) => form[e.key] !== data.notifications[e.key])

  const handleSave = () => {
    if (form) update.mutate(form)
  }

  const handleCancel = () => {
    if (data) setForm(data.notifications)
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Preferências de notificação
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Escolha como deseja ser notificado em cada situação
          </Typography>
        </Box>
        {hasChanges && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" onClick={handleCancel} disabled={update.isPending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={update.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
              onClick={handleSave}
              disabled={update.isPending}
            >
              Salvar alterações
            </Button>
          </Box>
        )}
      </Box>
      <Divider />

      {/* Table header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px',
          px: 4,
          py: 1.5,
          bgcolor: 'surface.sunken',
          borderBottom: 1,
          borderColor: 'border.subtle',
        }}
      >
        <Typography variant="overline" sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em' }}>
          EVENTO
        </Typography>
        <Typography
          variant="overline"
          sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em', textAlign: 'center' }}
        >
          NO APP
        </Typography>
      </Box>

      {EVENTS.map((event, idx) => (
        <Box key={event.key}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px',
              alignItems: 'center',
              px: 4,
              py: 2.5,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                {event.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {event.sublabel}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Switch
                checked={form[event.key]}
                onChange={() => toggle(event.key)}
                color="secondary"
              />
            </Box>
          </Box>
          {idx < EVENTS.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
