import { Paper, Typography } from '@mui/material'
import PremiumIconBadge from '../PremiumIconBadge'
import UpsellButton from '../UpsellButton'
import { premiumDashedSurfaceSx } from '../../utils/premium'
import type { Props } from './types'

// Card de propaganda inline (não-modal): ocupa o lugar de um conteúdo Pro bloqueado e leva
// para a tela de planos. Para bloquear UI existente com overlay, use PremiumLock; para um
// diálogo de upsell, use UpsellModal.
export default function UpsellCard({
  title = 'Recurso do plano Pro',
  description = 'Faça upgrade para o plano Pro e desbloqueie este recurso.',
}: Props) {
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
        ...premiumDashedSurfaceSx(false),
      }}
    >
      <PremiumIconBadge size="lg" />

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
        {description}
      </Typography>

      <UpsellButton sx={{ mt: 1 }} />
    </Paper>
  )
}
