import { Box, Card, Divider, Stack, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface SettingCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  danger?: boolean
  maxContentHeight?: number | string
}

export default function SettingCard({ title, subtitle, action, children, danger, maxContentHeight }: SettingCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        ...(danger && {
          borderColor: 'error.main',
          bgcolor: 'error.soft',
        }),
      }}
    >
      <Box
        sx={{
          px: 4,
          py: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: subtitle ? 'flex-start' : 'center',
        }}
      >
        <Box>
          <Typography variant="subtitle1" color={danger ? 'error.main' : 'text.primary'} sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Divider sx={danger ? { borderColor: 'error.main', opacity: 0.3 } : undefined} />
      <Stack
        divider={<Divider sx={danger ? { borderColor: 'error.main', opacity: 0.2 } : undefined} />}
        sx={maxContentHeight ? { maxHeight: maxContentHeight, overflowY: 'auto' } : undefined}
      >
        {children}
      </Stack>
    </Card>
  )
}
