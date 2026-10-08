import { NotificationsNone } from '@mui/icons-material'
import { Badge, IconButton } from '@mui/material'
import { useState } from 'react'
import { useNotifications } from '../../../../hooks/useNotifications'
import { useNotificationReadState } from '../../../../hooks/useNotificationReadState'
import NotificationPanel from '../NotificationPanel'

const EMPTY: never[] = []

export default function NotificationButton() {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useNotifications()
  const items = data ?? EMPTY
  const { readKeys, unreadCount, markRead, markAllRead } = useNotificationReadState(items)

  return (
    <>
      <Badge
        badgeContent={unreadCount}
        color="secondary"
        overlap="circular"
        sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
      >
        <IconButton
          onClick={() => setOpen(true)}
          size="small"
          aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
          sx={{
            color: 'text.tertiary',
            border: unreadCount > 0 ? 2 : 1,
            borderColor: unreadCount > 0 ? 'secondary.main' : 'border.subtle',
            borderRadius: 2,
            bgcolor: 'background.paper',
            width: 36,
            height: 36,
          }}
        >
          <NotificationsNone
            sx={{ fontSize: 18, color: unreadCount > 0 ? 'secondary.main' : 'border.subtle' }}
          />
        </IconButton>
      </Badge>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        isLoading={isLoading}
        isError={isError}
        readKeys={readKeys}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}
