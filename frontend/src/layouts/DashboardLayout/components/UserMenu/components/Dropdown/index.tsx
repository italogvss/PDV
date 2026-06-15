import type { SvgIconComponent } from '@mui/icons-material'
import {
  ArrowForwardOutlined,
  HelpOutlineOutlined,
  NotificationsNoneOutlined,
  PersonOutlined,
  SecurityOutlined,
  WorkspacePremiumOutlined
} from '@mui/icons-material'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../../../../store'
import { clearAuth } from '../../../../../../store/slices/auth.slice'
import { DropdownProps } from './types'

interface AccountItem {
  label: string
  icon: SvgIconComponent
  tab: string
  badge?: { label: string; tone: 'premium' | 'count' | 'neutral' }
}

const ACCOUNT_ITEMS: AccountItem[] = [
  { label: 'Meu perfil', icon: PersonOutlined, tab: 'perfil' },
  { label: 'Assinatura', icon: WorkspacePremiumOutlined, tab: 'assinatura', badge: { label: 'Premium', tone: 'premium' } },
  { label: 'Minhas lojas', icon: StorefrontOutlined, tab: 'negocios' },
]

const SECURITY_ITEMS: AccountItem[] = [
  { label: 'Segurança', icon: SecurityOutlined, tab: 'seguranca' },
  { label: 'Notificações', icon: NotificationsNoneOutlined, tab: 'notificacoes' },
]

const HELP_ITEMS: AccountItem[] = [
  { label: 'Central de ajuda', icon: HelpOutlineOutlined, tab: '' },
]

function ItemRow({ item, onClick }: { item: AccountItem; onClick: () => void }) {
  const Icon = item.icon
  return (
    <MenuItem sx={{ gap: 2, py: 1.25, px: 2.5 }} onClick={onClick}>
      <Icon sx={{ fontSize: 18, color: 'text.tertiary' }} />
      <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
        {item.label}
      </Typography>
      {item.badge?.tone === 'premium' && (
        <Chip
          label={item.badge.label}
          size="small"
          sx={{ height: 20, fontSize: 11, fontWeight: 600, px: 0.5, bgcolor: 'accent.100', color: 'accent.900' }}
        />
      )}
      {item.badge?.tone === 'count' && (
        <Chip
          label={item.badge.label}
          size="small"
          sx={{ height: 20, minWidth: 20, fontSize: 11, fontWeight: 600, bgcolor: 'success.soft', color: 'success.ink' }}
        />
      )}
    </MenuItem>
  )
}

export default function Dropdown({ anchorEl, open, onClose }: DropdownProps) {
  const auth = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  
  const initials = auth.name ?? "Usuário"
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const goToTab = (tab: string) => {
    onClose()
    navigate(tab ? `/configuracoes?tab=${tab}` : '/ajuda')
  }

  const handleLogout = () => {
    onClose()
    dispatch(clearAuth())
    navigate('/login')
  }

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            width: 320,
            maxHeight: '85vh',
            borderRadius: 3,
            border: 1,
            borderColor: 'border.subtle',
            boxShadow: (theme) => theme.customShadows.lg,
            overflow: 'auto',
          },
        },
        list: { disablePadding: true }
      }}
    >
      {/* Profile header — clica e vai para Meu perfil */}
      <Box
        sx={{ px: 2.5, py: 2.5, cursor: 'pointer', '&:hover': { bgcolor: 'surface.sunken' } }}
        onClick={() => goToTab('perfil')}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              sx={{ width: 44, height: 44, bgcolor: 'data.orange.main', color: 'common.white', fontSize: 14, fontWeight: 600 }}
              src={auth.avatarUrl ?? undefined}
            >
              {initials}
            </Avatar>
            <Box
              sx={{
                position: 'absolute', right: -2, bottom: -2,
                width: 14, height: 14, borderRadius: '50%',
                bgcolor: 'premium.400', border: 2, borderColor: 'background.paper',
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
              {auth.name}
            </Typography>
            <Typography variant="caption" color="text.tertiary" sx={{ display: 'block', mb: 1 }} noWrap>
              {auth.email}
            </Typography>
            <Chip
              icon={<WorkspacePremiumOutlined sx={{ fontSize: 14, color: 'inherit !important' }} />}
              label="PLANO PREMIUM"
              size="small"
              sx={{
                height: 22, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                bgcolor: 'premium.100', color: 'premium.900',
                '& .MuiChip-icon': { color: 'premium.700' },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'border.subtle' }} />

      <Box sx={{ py: 1 }}>
        {ACCOUNT_ITEMS.map((item) => (
          <ItemRow key={item.label} item={item} onClick={() => goToTab(item.tab)} />
        ))}
      </Box>

      <Divider sx={{ borderColor: 'border.subtle' }} />

      <Box sx={{ py: 1 }}>
        {SECURITY_ITEMS.map((item) => (
          <ItemRow key={item.label} item={item} onClick={() => goToTab(item.tab)} />
        ))}
      </Box>

      <Divider sx={{ borderColor: 'border.subtle' }} />

      <Box sx={{ py: 1 }}>
        {HELP_ITEMS.map((item) => (
          <ItemRow key={item.label} item={item} onClick={() => goToTab(item.tab)} />
        ))}
      </Box>

      <Divider sx={{ borderColor: 'border.subtle' }} />

      <Box sx={{ py: 1 }}>
        <MenuItem sx={{ gap: 2, py: 1.25, px: 2.5 }} onClick={handleLogout}>
          <ArrowForwardOutlined sx={{ fontSize: 18, color: 'error.main' }} />
          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
            Sair da conta
          </Typography>
        </MenuItem>
      </Box>
    </Menu>
  )
}
