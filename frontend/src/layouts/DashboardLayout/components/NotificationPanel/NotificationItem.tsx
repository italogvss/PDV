import { Box, Typography } from '@mui/material'
import type { NotificationItem as NotificationItemType, NotificationSeverity } from '../../../../types/notification.types'

interface Props {
  item: NotificationItemType
  isRead: boolean
  onClick: () => void
}

const severityColors: Record<NotificationSeverity, { bg: string; icon: string }> = {
  error: { bg: 'error.soft', icon: 'error.ink' },
  warning: { bg: 'warning.soft', icon: 'warning.ink' },
  info: { bg: 'info.soft', icon: 'info.ink' },
}

export default function NotificationItem({ item, isRead, onClick }: Props) {
  const Icon = item.icon
  const colors = severityColors[item.severity]

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 2.5,
        cursor: 'pointer',
        bgcolor: isRead ? 'transparent' : 'action.hover',
        '&:hover': { bgcolor: 'action.selected' },
        transition: 'background-color 0.15s',
      }}
    >
      {!isRead && (
        <Box
          sx={{
            position: 'absolute',
            left: 8,            
            top: '50%',
            transform: 'translateY(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'secondary.main',
            flexShrink: 0,
          }}
        />
      )}

      <Box
        sx={{
          width: 50,
          height: 50,
          borderRadius: 1,
          bgcolor: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 20, color: colors.icon }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {item.description}
        </Typography>
      </Box>
    </Box>
  )
}
