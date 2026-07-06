import { Box } from '@mui/material'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import type { Props } from './types'

// Selo dourado (ícone premium dentro de um círculo/retângulo) — a assinatura visual do plano Pro.
// Único primitivo para todos os badges premium: PremiumLock, UpsellCard, UpsellModal, banners e
// badges de avatar. Ver tons/tamanhos em types.ts.
const SIZES = { sm: 32, md: 36, lg: 52, xl: 64 } as const

const TONES = {
  solid: { bg: 'premium.400', fg: 'premium.900' },
  soft: { bg: 'premium.100', fg: 'premium.500' },
  muted: { bg: 'premium.200', fg: 'premium.800' },
} as const

export default function PremiumIconBadge({
  size = 'md',
  tone = 'solid',
  shape = 'circle',
  icon: Icon = WorkspacePremiumRounded,
  elevated = tone === 'solid',
  sx,
}: Props) {
  const px = SIZES[size]
  const { bg, fg } = TONES[tone]

  return (
    <Box
      sx={{
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: shape === 'circle' ? '50%' : 2,
        bgcolor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: elevated ? 2 : 0,
        ...sx,
      }}
    >
      <Icon sx={{ fontSize: Math.round(px * 0.55), color: fg }} />
    </Box>
  )
}
