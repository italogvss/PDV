import { Box, Button, Dialog, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import type { Props } from './types'

// Aviso simples pra quem já está no plano mais alto e esbarrou num limite — sem CTA de upgrade,
// porque não existe. Diferente do UpsellModal, que sempre oferece um caminho de upgrade.
export default function PlanLimitReachedDialog({
  open,
  onClose,
  title = 'Limite do plano atingido',
  description,
}: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

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

        <InfoOutlined sx={{ fontSize: 40, color: 'text.tertiary', mb: 1.5 }} />

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {description}
        </Typography>

        <Button variant="contained" fullWidth onClick={onClose}>
          Entendi
        </Button>
      </Box>
    </Dialog>
  )
}
