import { Box, Typography } from '@mui/material'
import type { NotificationItem as NotificationItemType, NotificationSeverity } from '../../../../types/notification.types'

interface Props {
  item: NotificationItemType
  isRead: boolean
  onClick: () => void
}

const severityColors: Record<NotificationSeverity, { bg: string; icon: string, border: string }> = {
  error: { bg: 'error.soft', icon: 'error.ink', border: "error.main" },
  warning: { bg: 'warning.soft', icon: 'warning.ink', border: "warning.main" },
  info: { bg: 'info.soft', icon: 'info.ink', border: "info.main" },
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
        '&:hover': { bgcolor: 'action.selected' },
        transition: 'background-color 0.15s',
      }}
    >
      <Box
        sx={{
          border: "1px solid",
          borderColor: colors.border,         
          width: 40,
          height: 40,
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
        <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
          {item.title}
        </Typography>
        <Typography variant="caption" noWrap sx={{ display: 'block', color: "text.tertiary" }}>
          {item.description}
        </Typography>
      </Box>

      <Box sx={{ flexShrink: 0, width: 8, display: 'flex', justifyContent: 'center' }}>
        {!isRead && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'secondary.main',
            }}
          />
        )}
      </Box>
    </Box>
  )
}
