import { Box, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import type { ModalHeaderProps } from './types'

/**
 * Header padrão das modais — título + subtítulo opcional + botão fechar (X).
 * Substitui os cinco estilos de DialogTitle que existiam soltos.
 */
export default function ModalHeader({ title, subtitle, onClose, disabled }: ModalHeaderProps) {
  return (
    <DialogTitle sx={{ pb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} disabled={disabled} sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseRounded sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </DialogTitle>
  )
}
