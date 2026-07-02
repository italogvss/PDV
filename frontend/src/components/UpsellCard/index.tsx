import { Box, Button, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import { useNavigate } from 'react-router-dom'
import type { Props } from './types'

// Card de propaganda inline (não-modal): ocupa o lugar de um conteúdo Pro bloqueado e leva
// para a tela de planos. Para bloquear UI existente com overlay, use PremiumLock; para um
// diálogo de upsell, use UpsellModal.
export default function UpsellCard({
  title = 'Recurso do plano Pro',
  description = 'Faça upgrade para o plano Pro e desbloqueie este recurso.',
}: Props) {
  const navigate = useNavigate()

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        borderStyle: 'dashed',
        borderColor: 'premium.400',
        bgcolor: (t) => alpha(t.palette.premium[100], 0.4),
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: 'premium.400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 2,
        }}
      >
        <WorkspacePremiumRounded sx={{ fontSize: 28, color: 'premium.900' }} />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
        {description}
      </Typography>

      <Button
        variant="contained"
        onClick={() => navigate('/configuracoes?tab=assinatura')}
        sx={{
          mt: 1,
          bgcolor: 'premium.400',
          color: 'premium.900',
          fontWeight: 700,
          '&:hover': { bgcolor: 'premium.500' },
        }}
      >
        Ver planos Pro
      </Button>
    </Paper>
  )
}
