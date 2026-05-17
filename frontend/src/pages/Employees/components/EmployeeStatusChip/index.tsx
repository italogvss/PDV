import { Box, Chip } from '@mui/material'
import type { EmployeeStatusChipProps } from './types'
import type { EmployeeStatus } from '../../types'

const chipColorMap: Record<EmployeeStatus, 'success' | 'warning' | 'default'> = {
  'Em turno': 'success',
  'Em pausa': 'warning',
  'Fora do turno': 'default',
}

const dotColorMap: Record<EmployeeStatus, string> = {
  'Em turno': 'success.main',
  'Em pausa': 'warning.main',
  'Fora do turno': 'text.disabled',
}

export default function EmployeeStatusChip({ status }: EmployeeStatusChipProps) {
  return (
    <Chip
      size="small"
      color={chipColorMap[status]}
      label={status}
      icon={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColorMap[status],
            ml: 0.75,
            mr: '-3px',
            flexShrink: 0,
          }}
        />
      }
    />
  )
}
