import { Box, Button, Dialog, Typography, useMediaQuery, useTheme } from '@mui/material'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import IconButton from '@mui/material/IconButton'
import { useNavigate } from 'react-router-dom'
import type { Props } from './types'

const DEFAULT_HIGHLIGHTS = [
  'Equipe e lojas ilimitadas',
  'Relatórios e painel analítico completos',
  'Histórico e auditoria sem limite de período',
]

// Modal reutilizável de propaganda: converte um limite atingido em oportunidade de upgrade.
// Em vez de bloquear silenciosamente, apresenta os benefícios do Pro + CTA para a tela de planos.
export default function UpsellModal({
  open,
  onClose,
  title = 'Desbloqueie com o plano Pro',
  description = 'Você atingiu um limite do seu plano atual. Faça upgrade para o Pro e continue crescendo sem barreiras.',
  highlights = DEFAULT_HIGHLIGHTS,
}: Props) {
  const navigate = useNavigate()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const goToPlans = () => {
    onClose()
    navigate('/configuracoes?tab=assinatura')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <Box sx={{ position: 'relative', p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: 'text.tertiary' }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>

        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: '50%',
            bgcolor: 'premium.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WorkspacePremiumRounded sx={{ fontSize: 34, color: 'premium.500' }} />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            textAlign: 'left',
            mb: 3,
          }}
        >
          {highlights.map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: 'premium.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckRounded sx={{ fontSize: 15, color: 'premium.500' }} />
              </Box>
              <Typography variant="body2" color="text.primary">
                {item}
              </Typography>
            </Box>
          ))}
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={goToPlans}
          sx={{
            bgcolor: 'premium.400',
            color: 'premium.900',
            fontWeight: 700,
            '&:hover': { bgcolor: 'premium.500' },
          }}
        >
          Ver planos Pro
        </Button>
        <Button variant="ghost" fullWidth sx={{ mt: 1 }} onClick={onClose}>
          Agora não
        </Button>
      </Box>
    </Dialog>
  )
}
