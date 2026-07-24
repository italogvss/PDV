import { Box, Typography } from '@mui/material'
import type { EmployeeAvatarProps } from './types'

export default function EmployeeAvatar({ initials, color = 'primary.main', size = 36 }: EmployeeAvatarProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontSize: size * 0.36,
          fontWeight: 700,
          color: 'common.white',
          lineHeight: 1,
          fontFamily: 'inherit',
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </Typography>
    </Box>
  )
}
