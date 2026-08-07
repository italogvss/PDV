import {
  CheckOutlined,
  CloseOutlined,
  ErrorOutlineOutlined,
  NotificationsNoneOutlined,
  SettingsOutlined,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Fragment, useCallback, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationItem from './NotificationItem'
import type { Props, TabValue } from './types'

export default function NotificationPanel({
  open,
  onClose,
  items,
  isLoading,
  isError,
  readKeys,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>('todas')

  const unreadItems = items.filter((item) => !readKeys.has(item.key))
  const filteredItems = tab === 'todas' ? items : unreadItems
  const unreadCount = unreadItems.length

  const handleItemClick = useCallback(
    (key: string, route: string) => {
      onMarkRead(key)
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
        // Volta para "Todas" só depois da animação de fechar — resetar durante a saída
        // faz a aba selecionada pular na frente do usuário.
        transition: { onExited: () => setTab('todas') },
        paper: {
          sx: {
            width: 380,
            maxWidth: '100vw',
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
        onChange={(_, v: TabValue) => setTab(v)}
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
        <Tab label={`Não lidas${unreadCount > 0 ? ` ${unreadCount}` : ''}`} value="nao-lidas" />
      </Tabs>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="rounded" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="85%" />
                </Box>
              </Box>
            ))}
          </Box>
        ) : isError ? (
          <EmptyState
            icon={<ErrorOutlineOutlined sx={{ fontSize: 40 }} />}
            message="Não foi possível carregar as notificações."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<NotificationsNoneOutlined sx={{ fontSize: 40 }} />}
            message={tab === 'nao-lidas' && items.length > 0 ? 'Nenhuma não lida.' : 'Tudo em dia!'}
          />
        ) : (
          filteredItems.map((item) => (
            <Fragment key={item.key}>
              <NotificationItem
                item={item}
                isRead={readKeys.has(item.key)}
                onClick={() => handleItemClick(item.key, item.route)}
              />
              <Divider sx={{ borderColor: 'border.subtle' }} />
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

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
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
      {icon}
      <Typography variant="body2">{message}</Typography>
    </Box>
  )
}
