import { Box, Chip } from '@mui/material'
import type { ExpenseStatusChipProps } from './types'

const colorMap = {
  Pago: 'success',
  Pendente: 'warning',
} as const

const dotColorMap = {
  success: 'success.main',
  warning: 'warning.main',
} as const

export default function ExpenseStatusChip({ status }: ExpenseStatusChipProps) {
  const color = colorMap[status]

  return (
    <Chip
      size="small"
      color={color}
      label={status}
      icon={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColorMap[color],
            ml: 0.75,
            mr: '-3px',
            flexShrink: 0,
          }}
        />
      }
    />
  )
}
