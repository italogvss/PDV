import { Chip, Box } from '@mui/material'
import type { StatusChipProps } from './types'
import type { SaleStatus } from '../../types'

type ChipColor = 'success' | 'warning' | 'error'

const colorMap: Record<SaleStatus, ChipColor> = {
  Pago: 'success',
  Pendente: 'warning',
  Cancelado: 'error',
}

export default function StatusChip({ status }: StatusChipProps) {
  return (
    <Chip
      size="small"
      color={colorMap[status]}
      label={status}
      icon={
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'currentColor',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      }
      sx={{
        '& .MuiChip-icon': {
          marginLeft: '7px',
          marginRight: '-3px',
          color: 'inherit',
        },
      }}
    />
  )
}
