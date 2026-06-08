import { Box, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  sublabel?: string
  children: ReactNode
  alignItems?: 'center' | 'flex-start'
}

export default function SettingRow({ label, sublabel, children, alignItems = 'center' }: SettingRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems,
        justifyContent: 'space-between',
        px: 4,
        py: 2.5,
        gap: 4,
        minHeight: 56,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {sublabel}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{children}</Box>
    </Box>
  )
}
