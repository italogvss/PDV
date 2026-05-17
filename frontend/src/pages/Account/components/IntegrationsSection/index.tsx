import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
} from '@mui/material'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'

const INTEGRATIONS = [
  { id: 'google', label: 'Google', description: 'Login com Google e sincronização com Google Calendar', status: 'conectado' },
  { id: 'whatsapp', label: 'WhatsApp Business', description: 'Notificações de pedidos e atendimento ao cliente', status: 'disponível' },
  { id: 'zapier', label: 'Zapier', description: 'Automatize fluxos com mais de 5.000 aplicativos', status: 'disponível' },
]

export default function IntegrationsSection() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          Integrações da conta
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Conecte serviços externos à sua conta de usuário
        </Typography>
      </Box>
      <Divider />

      {INTEGRATIONS.map((item, idx) => (
        <Box key={item.id}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
              py: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'surface.raised',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SyncAltOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {item.status === 'conectado' && (
                <Chip label="Conectado" size="small" sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }} />
              )}
              <Button variant="outlined" size="small" startIcon={<AddLinkOutlinedIcon />}>
                {item.status === 'conectado' ? 'Gerenciar' : 'Conectar'}
              </Button>
            </Box>
          </Box>
          {idx < INTEGRATIONS.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  )
}
