import { Box, Typography } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import { ServiceCardProps } from './types'

export default function ServiceCard({ service, onAdd }: ServiceCardProps) {
  return (
    <Box
      onClick={() => onAdd(service.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        border: 1,
        padding: 1.5,
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: 'secondary.main',
          boxShadow: (theme) => theme.customShadows.sm,
        },
      }}
    >
      <Box sx={{ borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: service.category?.color ?? "border.strong" }}>
        <Box
          sx={{
            height: 90,
            maxHeight: 90,
            width: '100%',
            background: (theme) =>
              `repeating-linear-gradient(-45deg, ${theme.palette.background.default}, ${theme.palette.background.default} 6px, ${theme.palette.divider} 6px, ${theme.palette.divider} 12px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {service.category?.name && (
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {service.category.name}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, px: 1, pt: 0.75 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }} noWrap>
          {service.name}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 'auto',
            pt: 5,
          }}
        >
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
            {formatBRL(service.price)}
          </Typography>
          {service.durationMinutes && (
            <Typography variant="caption" color="text.tertiary">
              {service.durationMinutes}min
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
