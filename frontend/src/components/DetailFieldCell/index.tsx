import { Box, Typography } from '@mui/material'
import type { DetailFieldCellProps, DetailFieldValueProps } from './types'

export function DetailFieldValue({ value, icon }: DetailFieldValueProps) {
  if (!value) return <Typography variant="body2" color="text.disabled">—</Typography>
  if (!icon) return <Typography variant="body2">{value}</Typography>
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}

export default function DetailFieldCell({ label, children, borderRight }: DetailFieldCellProps) {
  return (
    <Box
      sx={{
        px: 4,
        py: 2.5,
        ...(borderRight && { borderRight: '1px solid', borderColor: 'divider' }),
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.75 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}
