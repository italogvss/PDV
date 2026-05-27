import { Box, Chip } from '@mui/material'
import type { ExpenseStatusChipProps } from './types'

export default function ExpenseStatusChip({ isPaid }: ExpenseStatusChipProps) {
  const color = isPaid ? 'success' : 'warning'
  const label = isPaid ? 'Pago' : 'Pendente'
  const dotColor = isPaid ? 'success.main' : 'warning.main'

  return (
    <Chip
      size="small"
      color={color}
      label={label}
      icon={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColor,
            ml: 0.75,
            mr: '-3px',
            flexShrink: 0,
          }}
        />
      }
    />
  )
}
