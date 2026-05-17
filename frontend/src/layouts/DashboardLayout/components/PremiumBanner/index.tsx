import { Box, Typography } from '@mui/material'
import { WorkspacePremiumOutlined } from '@mui/icons-material'

export default function PremiumBanner() {
  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: 'premium.100',
          border: 1,
          borderColor: 'premium.200',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: 'premium.200',
            color: 'premium.800',
            flexShrink: 0,
          }}
        >
          <WorkspacePremiumOutlined sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'premium.900', lineHeight: 1.2 }}
          >
            Premium ativo
          </Typography>
          <Typography variant="caption" sx={{ color: 'premium.800' }}>
            Renova em 22 dias
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
