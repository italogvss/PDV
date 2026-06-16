import { useState, useCallback, useMemo } from 'react'
import { Badge, IconButton } from '@mui/material'
import { NotificationsNoneOutlined } from '@mui/icons-material'
import { useAppSelector } from '../../../../store'
import { buildNotificationItems, useNotifications } from '../../../../hooks/useNotifications'
import NotificationPanel from '../NotificationPanel'

function buildHash(counts: unknown): string {
  return JSON.stringify(counts)
}

function getStoredHash(tenantId: string): string {
  return localStorage.getItem(`notifications_hash_${tenantId}`) ?? ''
}

function saveHash(tenantId: string, hash: string): void {
  localStorage.setItem(`notifications_hash_${tenantId}`, hash)
}

export default function NotificationButton() {
  const [open, setOpen] = useState(false)
  const tenantId = useAppSelector((s) => s.auth.tenantId) ?? ''
  const { data: counts } = useNotifications()

  const currentHash = useMemo(() => (counts ? buildHash(counts) : ''), [counts])
  const hasItems = counts ? buildNotificationItems(counts).length > 0 : false
  const isRead = !hasItems || currentHash === getStoredHash(tenantId)

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  const handleMarkAllRead = useCallback(() => {
    if (tenantId) saveHash(tenantId, currentHash)
    setOpen(false)
  }, [tenantId, currentHash])

  return (
    <>
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          color: 'text.tertiary',
          border: 1,
          borderColor: 'border.subtle',
          borderRadius: 2,
          bgcolor: 'background.paper',
          width: 36,
          height: 36,
        }}
      >
        <Badge
          variant="dot"
          color="secondary"
          invisible={isRead}
          sx={{
            '& .MuiBadge-dot': {
              width: 7,
              height: 7,
              minWidth: 7,
              top: 1,
              right: 1,
            },
          }}
        >
          <NotificationsNoneOutlined sx={{ fontSize: 18 }} />
        </Badge>
      </IconButton>

      <NotificationPanel
        open={open}
        onClose={handleClose}
        onMarkAllRead={handleMarkAllRead}
        isRead={isRead}
      />
    </>
  )
}
