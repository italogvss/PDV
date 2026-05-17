import { Box, Button, Typography } from '@mui/material'
import {
  RestartAltRounded,
} from '@mui/icons-material'

export default function SalesHeader() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        gap: 3,
      }}
    >
      <Box>
        <Typography variant="h2" color="text.primary" sx={{ mb: 0.5 }}>
          Ponto de venda
        </Typography>
        <Typography variant="body2" color="text.tertiary">
          Operador: João · Caixa #03 · Abertura 08:32
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<RestartAltRounded />}>Recomeçar</Button>
      </Box>
    </Box>
  )
}
