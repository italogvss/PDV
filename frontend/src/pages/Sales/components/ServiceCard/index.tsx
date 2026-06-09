import { Box, Typography } from '@mui/material'
import { MiscellaneousServicesOutlined } from '@mui/icons-material'
import { formatBRL } from '../../../../utils/currency'
import { ServiceCardProps } from './types'

export default function ServiceCard({ service, onAdd }: ServiceCardProps) {
  const color = service.category?.color ?? '#9e9e9e'

  return (
    <Box
      onClick={() => onAdd(service.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          borderColor: 'border.strong',
          boxShadow: (theme) => theme.customShadows.sm,
        },
      }}
    >
      <Box
        sx={{
          height: 72,
          borderRadius: 2,
          bgcolor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <MiscellaneousServicesOutlined sx={{ fontSize: 28 }} />
      </Box>
      <Box sx={{ pl: 1 }}>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontWeight: 500, mb: 0.5 }}
          noWrap
        >
          {service.name}
        </Typography>
        <Typography variant="body2" color="text.tertiary" sx={{ fontWeight: 600 }}>
          {formatBRL(service.price)}
        </Typography>
        {service.durationMinutes && (
          <Typography variant="caption" color="text.tertiary">
            {service.durationMinutes}min
          </Typography>
        )}
      </Box>
    </Box>
  )
}
