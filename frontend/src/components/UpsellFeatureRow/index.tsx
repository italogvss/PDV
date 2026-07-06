import { useState } from 'react'
import { Box, Chip, Paper, Typography } from '@mui/material'
import PremiumIconBadge from '../PremiumIconBadge'
import UpsellModal from '../UpsellModal'
import { premiumDashedSurfaceSx } from '../../utils/premium'
import type { Props } from './types'

// Linha-teaser clicável de recurso Pro: superfície tracejada dourada + selo + chip "Pro" que abre
// a UpsellModal. Use no lugar de um controle bloqueado quando o plano não concede a feature
// (ex.: despesa recorrente, salário automático). Para bloquear UI já existente com overlay use
// PremiumLock; para um placeholder que ocupa a área inteira use UpsellCard.
export default function UpsellFeatureRow({
  title,
  description,
  chipLabel = 'Pro',
  ariaLabel,
  modalTitle,
  modalDescription,
  modalHighlights,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Paper
        variant="outlined"
        role="button"
        aria-label={ariaLabel ?? `${title} — recurso do plano Pro`}
        onClick={() => setOpen(true)}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          ...premiumDashedSurfaceSx(),
        }}
      >
        <PremiumIconBadge size="md" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Chip label={chipLabel} color="premium" size="small" />
      </Paper>

      <UpsellModal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        description={modalDescription}
        highlights={modalHighlights}
      />
    </>
  )
}
