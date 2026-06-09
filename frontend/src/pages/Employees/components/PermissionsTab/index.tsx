import { Box, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

export default function PermissionsTab() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 2 }}>
      <InfoOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary', mt: 0.25 }} />
      <Typography variant="body2" color="text.secondary">
        As permissões são configuradas por papel em <strong>Configurações → Equipe</strong>.
        Acesse essa seção para definir o que cada papel pode fazer.
      </Typography>
    </Box>
  )
}
