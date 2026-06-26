import {
  AccountBalanceWalletOutlined,
  CalendarTodayOutlined,
  CheckOutlined,
  CloseOutlined,
  ErrorOutlined,
  NotificationsNoneOutlined,
  RemoveShoppingCartOutlined,
  ScheduleOutlined,
  SettingsOutlined,
  TrendingDownOutlined,
  WarningAmberOutlined,
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
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildNotificationItems, useNotifications } from '../../../../hooks/useNotifications'
import { useAppSelector } from '../../../../store'
import type { NotificationCategory, NotificationItem as NotificationItemType } from '../../../../types/notification.types'
import NotificationItem from './NotificationItem'

// Apenas em desenvolvimento — cobre todos os tipos de notificação para visualização
const DEV_MOCK_ITEMS: NotificationItemType[] = import.meta.env.DEV
  ? [
    { id: 'mock-out-of-stock', category: 'estoque', severity: 'error', icon: RemoveShoppingCartOutlined, title: '[Mock] Produtos sem estoque', description: '3 produtos sem estoque', route: '/estoque' },
    { id: 'mock-critical-stock', category: 'estoque', severity: 'error', icon: ErrorOutlined, title: '[Mock] Estoque crítico', description: '5 produtos em nível crítico', route: '/estoque' },
    { id: 'mock-low-stock', category: 'estoque', severity: 'warning', icon: WarningAmberOutlined, title: '[Mock] Estoque baixo', description: '2 produtos com estoque baixo', route: '/estoque' },
    { id: 'mock-negative-stock', category: 'estoque', severity: 'error', icon: TrendingDownOutlined, title: '[Mock] Estoque negativo', description: '1 produto com estoque negativo', route: '/estoque' },
    { id: 'mock-overdue-expenses', category: 'financeiro', severity: 'error', icon: AccountBalanceWalletOutlined, title: '[Mock] Despesas vencidas', description: '2 despesas vencidas', route: '/despesas' },
    { id: 'mock-upcoming-expenses', category: 'financeiro', severity: 'warning', icon: ScheduleOutlined, title: '[Mock] Despesas a vencer', description: '4 despesas vencem nos próximos 7 dias', route: '/despesas' },
    { id: 'mock-appointments', category: 'agendamentos', severity: 'info', icon: CalendarTodayOutlined, title: '[Mock] Agendamentos hoje', description: '7 agendamentos para hoje', route: '/agendamentos' },
    { id: 'mock-appointments', category: 'agendamentos', severity: 'info', icon: CalendarTodayOutlined, title: '[Mock] Agendamentos hoje', description: '7 agendamentos para hoje', route: '/agendamentos' },
    { id: 'mock-appointments', category: 'agendamentos', severity: 'info', icon: CalendarTodayOutlined, title: '[Mock] Agendamentos hoje', description: '7 agendamentos para hoje', route: '/agendamentos' },
    { id: 'mock-appointments', category: 'agendamentos', severity: 'info', icon: CalendarTodayOutlined, title: '[Mock] Agendamentos hoje', description: '7 agendamentos para hoje', route: '/agendamentos' },
    { id: 'mock-appointments', category: 'agendamentos', severity: 'info', icon: CalendarTodayOutlined, title: '[Mock] Agendamentos hoje', description: '7 agendamentos para hoje', route: '/agendamentos' },
  
  ]
  : []

interface Props {
  open: boolean
  onClose: () => void
  onMarkAllRead: () => void
  isRead: boolean
}

type TabValue = 'todas' | 'nao-lidas' | NotificationCategory

export default function NotificationPanel({ open, onClose, onMarkAllRead, isRead }: Props) {
  const navigate = useNavigate()
  const modules = useAppSelector((s) => s.auth.modules)
  const [tab, setTab] = useState<TabValue>('todas')

  const { data: counts } = useNotifications()
  const allItems = [...(counts ? buildNotificationItems(counts) : []), ...DEV_MOCK_ITEMS]

  const hasAppointments = modules.includes('appointments')

  const filteredItems = allItems.filter((item) => {
    if (tab === 'todas') return true
    if (tab === 'nao-lidas') return !isRead
    return item.category === tab
  })

  useEffect(() => {
    if (!open) setTab('todas')
  }, [open])

  const handleItemClick = useCallback(
    (route: string) => {
      navigate(route)
      onClose()
    },
    [navigate, onClose],
  )

  const unreadCount = isRead ? 0 : allItems.length

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
          Notificações <Box component="span" sx={{ color: 'text.tertiary', fontWeight: 400 }}>{unreadCount > 0 ? ` (${unreadCount})` : ''}</Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isRead && allItems.length > 0 && (
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
          '& .MuiTab-root': { minHeight: 40, p: 1, borderRadius: 999},
          '& .MuiTab-root:hover': { bgcolor: 'action.hover' },
          '& .MuiTab-root.Mui-selected': { bgcolor: 'action.selected', color: 'text.primary', border: "1px solid", borderColor: "border.strong", },
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
              <>
                <NotificationItem
                  key={item.id}
                  item={item}
                  isRead={isRead}
                  onClick={() => handleItemClick(item.route)}
                />
                <Divider color="border.subtle" />
              </>
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
