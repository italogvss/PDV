import { Box, Typography, useTheme } from '@mui/material'
import type { AvatarColorKey } from '../../types'
import type { EmployeeAvatarProps } from './types'

export default function EmployeeAvatar({ initials, colorKey, size = 36 }: EmployeeAvatarProps) {
  const theme = useTheme()

  const bgMap: Record<AvatarColorKey, string> = {
    purple: theme.palette.data.purple.main,
    accent: theme.palette.success.main,
    orange: theme.palette.data.orange.main,
    pink: theme.palette.data.pink.main,
    blue: theme.palette.data.blue.main,
    teal: theme.palette.data.teal.main,
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bgMap[colorKey],
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
          color: 'text.primary',
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
