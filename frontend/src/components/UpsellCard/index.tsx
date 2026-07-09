import CheckRounded from '@mui/icons-material/CheckRounded'
import { Box, Paper, Typography } from '@mui/material'
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
  highlights,
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

      {highlights && highlights.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', my: 0.5 }}>
          {highlights.map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <PremiumIconBadge size="sm" tone="soft" icon={CheckRounded} sx={{ width: 22, height: 22 }} />
              <Typography variant="body2" color="text.primary">
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <UpsellButton sx={{ mt: 1 }} />
    </Paper>
  )
}
