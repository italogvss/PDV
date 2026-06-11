import { useState } from 'react'
import {
  Box,
  Typography,
  Switch,
  Paper,
  Divider,
} from '@mui/material'

interface NotificationEvent {
  id: string
  label: string
  sublabel: string
  inApp: boolean
}

const EVENTS: NotificationEvent[] = [
  { id: 'new_sales', label: 'Novas vendas', sublabel: 'Cada pedido finalizado', inApp: true },
  { id: 'stock_alerts', label: 'Alertas de estoque', sublabel: 'Produtos abaixo do mínimo', inApp: true },
  { id: 'invoices', label: 'Contas e faturas', sublabel: 'Vencimentos e cobranças', inApp: true },
  { id: 'team_activity', label: 'Atividade da equipe', sublabel: 'Funcionários batem ponto, fechamento de caixa', inApp: true },
]

export default function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, { inApp: boolean }>>(
    Object.fromEntries(EVENTS.map((e) => [e.id, { inApp: e.inApp }]))
  )

  const toggle = (id: string) => {
    setPrefs((prev) => ({ ...prev, [id]: { inApp: !prev[id].inApp } }))
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3 }}>
        <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
          Preferências de notificação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Escolha como deseja ser notificado em cada situação
        </Typography>
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
        <Box key={event.id}>
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
                checked={prefs[event.id].inApp}
                onChange={() => toggle(event.id)}
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
