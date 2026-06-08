import { Box, Typography, Button, Chip } from '@mui/material'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'
import SettingCard from '../../../../components/SettingCard'

const INTEGRATIONS = [
  { id: 'ifood', label: 'iFood', description: 'Pedidos e cardápio digital', status: 'disponível' },
  { id: 'stone', label: 'Stone', description: 'Maquininha e gateway de pagamento', status: 'conectado' },
  { id: 'nuvemshop', label: 'Nuvemshop', description: 'Sincronização de estoque e vendas online', status: 'disponível' },
  { id: 'contaazul', label: 'Conta Azul', description: 'Exportação contábil automática', status: 'disponível' },
]

export default function IntegrationsSection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SettingCard title="Integrações disponíveis" subtitle="Conecte o PDV a outros serviços">
        {INTEGRATIONS.map((integration) => (
          <Box
            key={integration.id}
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
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {integration.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {integration.description}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {integration.status === 'conectado' && (
                <Chip
                  label="Conectado"
                  size="small"
                  sx={{ bgcolor: 'success.soft', color: 'success.ink', fontWeight: 600 }}
                />
              )}
              <Button
                variant={integration.status === 'conectado' ? 'outlined' : 'outlined'}
                size="small"
                startIcon={<AddLinkOutlinedIcon />}
              >
                {integration.status === 'conectado' ? 'Gerenciar' : 'Conectar'}
              </Button>
            </Box>
          </Box>
        ))}
      </SettingCard>
    </Box>
  )
}
