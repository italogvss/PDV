import { Box, Chip } from '@mui/material'
import { CREDIT_STATUS_COLORS, resolveDisplayStatus } from './types'
import type { Props } from './types'

export default function CreditStatusChip({ status, isOverdue, prefix }: Props) {
  const display = resolveDisplayStatus(status, isOverdue)

  return (
    <Chip
      size="small"
      color={CREDIT_STATUS_COLORS[display]}
      label={prefix ? `${prefix}: ${display.toLowerCase()}` : display}
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
