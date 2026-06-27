import { NotificationsNone } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { buildNotificationItems, useNotifications } from '../../../../hooks/useNotifications'
import { useAppSelector } from '../../../../store'
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
          border: isRead ? 2 : 1,
          borderColor: isRead ? "secondary.main" : 'border.subtle',
          borderRadius: 2,
          bgcolor: 'background.paper',
          width: 36,
          height: 36,
        }}
      >
        <NotificationsNone sx={{ fontSize: 18, color: isRead ? "secondary.main" : "border.subtle" }} />
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
