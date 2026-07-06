import { useState } from 'react'
import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEntitlements } from '../../hooks/useSubscription'
import PremiumIconBadge from '../PremiumIconBadge'
import UpsellModal from '../UpsellModal'
import type { Props } from './types'

// Envolve um trecho de UI e o bloqueia com overlay premium quando o plano não concede a feature.
// O conteúdo continua visível (esmaecido, não interativo); clicar no overlay abre a UpsellModal.
// Se a feature está no plano, renderiza o conteúdo normalmente (passthrough).
export default function PremiumLock({ feature, children, title, description, radius = 2 }: Props) {
  const { has } = useEntitlements()
  const [open, setOpen] = useState(false)

  if (has(feature)) return <>{children}</>

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <Box aria-hidden sx={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
          {children}
        </Box>

        <Box
          role="button"
          aria-label="Recurso exclusivo do plano Pro"
          onClick={() => setOpen(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px dashed',
            borderColor: 'premium.400',
            bgcolor: (t) => alpha(t.palette.premium[100], 0.5),
            transition: 'background-color .15s',
            '&:hover': { bgcolor: (t) => alpha(t.palette.premium[200], 0.65) },
          }}
        >
          <PremiumIconBadge size="md" />
        </Box>
      </Box>

      <UpsellModal open={open} onClose={() => setOpen(false)} title={title} description={description} />
    </>
  )
}
