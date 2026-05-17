import { Box, Avatar, Typography, IconButton } from '@mui/material'
import { UnfoldMore } from '@mui/icons-material'

export default function StoreSelector() {
  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'border.subtle',
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: 'surface.sunken' },
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 28,
            height: 28,
            bgcolor: 'accent.600',
            color: 'common.white',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          CE
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
            noWrap
          >
            Café da Esquina
          </Typography>
          <Typography variant="caption" color="text.tertiary">
            Plano Premium
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: 'text.tertiary' }}>
          <UnfoldMore sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  )
}
