import { Box, IconButton, Typography } from '@mui/material'
import { CloseRounded } from '@mui/icons-material'
import { formatBRL } from '../../../../utils/currency'
import { ServiceCartItemProps } from './types'

export default function ServiceCartItem({ service, lineId, onRemove }: ServiceCartItemProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        py: 2,
        borderBottom: 1,
        borderColor: 'border.subtle',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {service.name}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onRemove(lineId)}
          sx={{ p: 0.5, color: 'text.tertiary', '&:hover': { color: 'error.main' } }}
        >
          <CloseRounded sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.tertiary">
          Serviço
        </Typography>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
          {formatBRL(service.price)}
        </Typography>
      </Box>
    </Box>
  )
}
