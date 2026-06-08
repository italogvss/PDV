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
  email: boolean
  push: boolean
  inApp: boolean
  emailOnly?: boolean
}

const EVENTS: NotificationEvent[] = [
  { id: 'new_sales', label: 'Novas vendas', sublabel: 'Cada pedido finalizado', email: false, push: true, inApp: true },
  { id: 'stock_alerts', label: 'Alertas de estoque', sublabel: 'Produtos abaixo do mínimo', email: true, push: true, inApp: true },
  { id: 'invoices', label: 'Contas e faturas', sublabel: 'Vencimentos e cobranças', email: true, push: false, inApp: true },
  { id: 'team_activity', label: 'Atividade da equipe', sublabel: 'Funcionários batem ponto, fechamento de caixa', email: false, push: false, inApp: true },
  { id: 'updates', label: 'Novidades e dicas', sublabel: 'Receber atualizações de produto e tutoriais', email: false, push: false, inApp: false, emailOnly: true },
]

export default function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; push: boolean; inApp: boolean }>>(
    Object.fromEntries(EVENTS.map((e) => [e.id, { email: e.email, push: e.push, inApp: e.inApp }]))
  )

  const toggle = (id: string, channel: 'email' | 'push' | 'inApp') => {
    setPrefs((prev) => ({ ...prev, [id]: { ...prev[id], [channel]: !prev[id][channel] } }))
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
          gridTemplateColumns: '1fr 100px 100px 100px',
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
        {['E-MAIL', 'PUSH', 'NO APP'].map((col) => (
          <Typography
            key={col}
            variant="overline"
            sx={{ fontSize: 11, fontWeight: 700, color: 'text.tertiary', letterSpacing: '0.06em', textAlign: 'center' }}
          >
            {col}
          </Typography>
        ))}
      </Box>

      {EVENTS.map((event, idx) => (
        <Box key={event.id}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 100px',
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

            {event.emailOnly ? (
              /* Last row "Novidades e dicas" has inline label+switch pairs */
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">E-mail</Typography>
                  <Switch
                    checked={prefs[event.id].email}
                    onChange={() => toggle(event.id, 'email')}
                    color="secondary"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">Push</Typography>
                  <Switch
                    checked={prefs[event.id].push}
                    onChange={() => toggle(event.id, 'push')}
                    color="secondary"
                    size="small"
                  />
                </Box>
                <Box />
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Switch
                    checked={prefs[event.id].email}
                    onChange={() => toggle(event.id, 'email')}
                    color="secondary"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Switch
                    checked={prefs[event.id].push}
                    onChange={() => toggle(event.id, 'push')}
                    color="secondary"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Switch
                    checked={prefs[event.id].inApp}
                    onChange={() => toggle(event.id, 'inApp')}
                    color="secondary"
                    size="small"
                  />
                </Box>
              </>
            )}
          </Box>
          {idx < EVENTS.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
