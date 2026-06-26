import InboxOutlined from '@mui/icons-material/InboxOutlined'
import { Box, Typography } from '@mui/material'

export default function DataGridNoRowsOverlay() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 5, color: 'text.tertiary' }}>
      <InboxOutlined sx={{ fontSize: 36 }} />
      <Typography variant="body2">Nenhum resultado encontrado</Typography>
    </Box>
  )
}
