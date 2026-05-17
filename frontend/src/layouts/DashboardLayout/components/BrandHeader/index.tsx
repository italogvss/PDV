import { Box, Avatar, Typography } from '@mui/material'

export default function BrandHeader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 3,
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'text.primary',
          color: 'background.paper',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Z
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          color="text.primary"
          sx={{ fontWeight: 600, lineHeight: 1.2 }}
        >
          Zelo
        </Typography>
        <Typography variant="caption" color="text.tertiary">
          Gestão de comércio
        </Typography>
      </Box>
    </Box>
  )
}
