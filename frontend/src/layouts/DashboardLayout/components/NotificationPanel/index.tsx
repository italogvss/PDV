import {
  CheckOutlined,
  CloseOutlined,
  NotificationsNoneOutlined,
  SettingsOutlined,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildNotificationItems, useNotifications } from '../../../../hooks/useNotifications'
import NotificationItem from './NotificationItem'

interface Props {
  open: boolean
  onClose: () => void
  readIds: Set<string>
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

type TabValue = 'todas' | 'nao-lidas'

export default function NotificationPanel({ open, onClose, readIds, onMarkRead, onMarkAllRead }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>('todas')

  const { data: counts } = useNotifications()
  const allItems = counts ? buildNotificationItems(counts) : []
  const unreadItems = allItems.filter((item) => !readIds.has(item.id))
  const filteredItems = tab === 'todas' ? allItems : unreadItems
  const unreadCount = unreadItems.length

  useEffect(() => {
    if (!open) setTab('todas')
  }, [open])

  const handleItemClick = useCallback(
    (id: string, route: string) => {
      onMarkRead(id)
      navigate(route)
      onClose()
    },
    [onMarkRead, navigate, onClose],
  )

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(4px)' } },
        paper: {
          sx: {
            width: 380,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 3,
          pb: 1.5,
          borderBottom: 1,
          borderColor: 'border.subtle',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Notificações{' '}
          <Box component="span" sx={{ color: 'text.tertiary', fontWeight: 400 }}>
            {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckOutlined sx={{ fontSize: 14 }} />}
              onClick={onMarkAllRead}
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 500,
                px: 1,
                '&:hover': { color: 'text.primary' },
              }}
            >
              Marcar todas
            </Button>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.tertiary' }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as TabValue)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          px: 2,
          minHeight: 30,
          my: 1,
          '& .MuiTab-root': { minHeight: 40, p: 1, borderRadius: 999 },
          '& .MuiTab-root:hover': { bgcolor: 'action.hover' },
          '& .MuiTab-root.Mui-selected': { borderRadius: 999, bgcolor: 'action.selected', color: 'text.primary', border: '1px solid', borderColor: 'border.strong' },
        }}
      >
        <Tab label="Todas" value="todas" />
        <Tab
          label={`Não lidas${unreadCount > 0 ? ` ${unreadCount}` : ''}`}
          value="nao-lidas"
        />
      </Tabs>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              height: '100%',
              minHeight: 200,
              color: 'text.disabled',
            }}
          >
            <NotificationsNoneOutlined sx={{ fontSize: 40 }} />
            <Typography variant="body2">Tudo em dia!</Typography>
          </Box>
        ) : (
          filteredItems.map((item) => (
            <Fragment key={item.id}>
              <NotificationItem
                item={item}
                isRead={readIds.has(item.id)}
                onClick={() => handleItemClick(item.id, item.route)}
              />
              <Divider color="border.subtle" />
            </Fragment>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: 'border.subtle',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          size="small"
          startIcon={<SettingsOutlined sx={{ fontSize: 14 }} />}
          onClick={() => {
            navigate('/configuracoes?tab=notificacoes')
            onClose()
          }}
          sx={{ color: 'text.secondary', fontSize: '0.75rem', px: 1 }}
        >
          Preferências
        </Button>
      </Box>
    </Drawer>
  )
}
