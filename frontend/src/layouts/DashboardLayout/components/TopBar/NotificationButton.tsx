import { NotificationsNone } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { buildNotificationItems, useNotifications } from '../../../../hooks/useNotifications'
import { useAppSelector } from '../../../../store'
import NotificationPanel from '../NotificationPanel'

interface StoredReadState {
  hash: string
  readIds: string[]
}

function storageKey(tenantId: string) {
  return `notifications_read_${tenantId}`
}

function loadReadState(tenantId: string): StoredReadState {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (raw) return JSON.parse(raw) as StoredReadState
  } catch { /* ignore */ }
  return { hash: '', readIds: [] }
}

function saveReadState(tenantId: string, state: StoredReadState): void {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(state))
}

export default function NotificationButton() {
  const [open, setOpen] = useState(false)
  const tenantId = useAppSelector((s) => s.auth.tenantId) ?? ''
  const { data: counts } = useNotifications()

  const currentHash = useMemo(() => (counts ? JSON.stringify(counts) : ''), [counts])
  const allItems = useMemo(() => (counts ? buildNotificationItems(counts) : []), [counts])

  const [readState, setReadState] = useState<StoredReadState>(() => loadReadState(tenantId))

  // Só usa os IDs lidos se o hash bater — hash diferente = dados mudaram = tudo não-lido
  const readIds = useMemo<Set<string>>(
    () => (readState.hash === currentHash ? new Set(readState.readIds) : new Set()),
    [readState, currentHash],
  )

  const hasUnread = allItems.length > 0 && allItems.some((item) => !readIds.has(item.id))

  // Functional updater: lê o estado mais recente de dentro do setter — evita stale closure
  const handleMarkRead = useCallback(
    (id: string) => {
      setReadState((prev) => {
        const base = prev.hash === currentHash ? new Set(prev.readIds) : new Set<string>()
        base.add(id)
        const next: StoredReadState = { hash: currentHash, readIds: [...base] }
        if (tenantId) saveReadState(tenantId, next)
        return next
      })
    },
    [currentHash, tenantId],
  )

  const handleMarkAllRead = useCallback(() => {
    const next: StoredReadState = { hash: currentHash, readIds: allItems.map((i) => i.id) }
    setReadState(next)
    if (tenantId) saveReadState(tenantId, next)
    setOpen(false)
  }, [currentHash, allItems, tenantId])

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        size="small"
        sx={{
          color: 'text.tertiary',
          border: hasUnread ? 2 : 1,
          borderColor: hasUnread ? 'secondary.main' : 'border.subtle',
          borderRadius: 2,
          bgcolor: 'background.paper',
          width: 36,
          height: 36,
        }}
      >
        <NotificationsNone sx={{ fontSize: 18, color: hasUnread ? 'secondary.main' : 'border.subtle' }} />
      </IconButton>
      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        readIds={readIds}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  )
}
