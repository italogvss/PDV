import { useState } from 'react'
import type { SvgIconComponent } from '@mui/icons-material'
import {
  ArrowForwardOutlined,
  HelpOutlineOutlined,
  NotificationsNoneOutlined,
  PersonOutlined,
  TuneOutlined,
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
import UpsellModal from '../../../../../../components/UpsellModal'
import { FEATURES } from '../../../../../../constants/entitlements'
import { useEntitlements } from '../../../../../../hooks/useSubscription'
import { useUserPermissions } from '../../../../../../hooks/useUserPermissions'
import { useAppDispatch, useAppSelector } from '../../../../../../store'
import { clearAuth } from '../../../../../../store/slices/auth.slice'
import { clearStoredPlanSlug } from '../../../../../../utils/planSelection'
import { DropdownProps } from './types'

interface AccountItem {
  label: string
  icon: SvgIconComponent
  tab: string
  badge?: { label: string; tone: 'premium' | 'count' | 'neutral' }
  ownerOnly?: boolean
}

const BASE_ACCOUNT_ITEMS: AccountItem[] = [
  { label: 'Meu perfil', icon: PersonOutlined, tab: 'perfil' },
  { label: 'Minhas lojas', icon: StorefrontOutlined, tab: 'negocios', ownerOnly: true },
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
          icon={<WorkspacePremiumOutlined />}
          label={item.badge.label}
          color="premium"
          size="small"
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

// A paleta premium (dourada) é exclusiva do plano Profissional — o Essencial (pago, mas sem as
// features Pro) usa a accent do tenant, e sem plano ativo fica neutro.
const PRO_STYLE = { chipBg: 'premium.100', chipColor: 'premium.900', avatarOutlineColor: 'premium.400' as string | null }
const ESSENCIAL_STYLE = { chipBg: 'accent.100', chipColor: 'accent.900', avatarOutlineColor: 'accent.400' as string | null }
const NO_PLAN_STYLE = { chipBg: 'action.hover', chipColor: 'text.secondary', avatarOutlineColor: null as string | null }

export default function Dropdown({ anchorEl, open, onClose }: DropdownProps) {
  const auth = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { has } = useEntitlements()
  const { isOwner } = useUserPermissions()
  const [upsellOpen, setUpsellOpen] = useState(false)

  const isPaid = (auth.subscription?.planId ?? null) !== null
  const planName = isPaid ? auth.subscription?.planName ?? 'Ativo' : 'Sem plano'
  // Sem tier hardcoded (ver subscription.types.ts) — `advancedDashboard` só está nas entitlements
  // do Profissional, então serve de proxy para "é o plano Pro" (mesmo padrão do Dashboard).
  const isProfissional = has(FEATURES.advancedDashboard)
  const ts = isProfissional ? PRO_STYLE : isPaid ? ESSENCIAL_STYLE : NO_PLAN_STYLE

  // Notificações é gateada por plano: sem o entitlement, o item ganha badge Pro e vira CTA de upsell.
  const canUseNotifications = has(FEATURES.notifications)
  const securityItems: AccountItem[] = [
    { label: 'Aparência', icon: TuneOutlined, tab: 'aparencia' },
    {
      label: 'Notificações',
      icon: NotificationsNoneOutlined,
      tab: 'notificacoes',
      ...(canUseNotifications ? {} : { badge: { label: 'Pro', tone: 'premium' as const } }),
    },
  ]

  const initials = (auth.name ?? 'Usuário')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const goToTab = (tab: string) => {
    onClose()
    navigate(tab ? `/configuracoes?tab=${tab}` : '/ajuda')
  }

  const openUpsell = () => {
    onClose()
    setUpsellOpen(true)
  }

  const handleLogout = () => {
    onClose()
    dispatch(clearAuth())
    clearStoredPlanSlug()
    navigate(import.meta.env.VITE_LANDING_URL);
  }

  return (
    <>
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
            <Box sx={{ flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 44, height: 44, bgcolor: 'data.orange.main', color: 'common.white', fontSize: 14, fontWeight: 600,
                  ...(ts.avatarOutlineColor && { outline: '2px solid', outlineColor: ts.avatarOutlineColor, outlineOffset: '2px' }),
                }}
                src={auth.avatarUrl ?? undefined}
              >
                {initials}
              </Avatar>
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
                label={isPaid ? `PLANO ${planName.toUpperCase()}` : 'SEM PLANO'}
                size="small"
                sx={{
                  height: 22, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  bgcolor: ts.chipBg, color: ts.chipColor,
                  '& .MuiChip-icon': { color: ts.chipColor },
                }}
              />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'border.subtle' }} />

        <Box sx={{ py: 1 }}>
          {isOwner && (
            <MenuItem sx={{ gap: 2, py: 1.25, px: 2.5 }} onClick={() => goToTab('assinatura')}>
              <WorkspacePremiumOutlined sx={{ fontSize: 18, color: 'text.tertiary' }} />
              <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>Assinatura</Typography>
              <Chip
                label={planName}
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 600, px: 0.5, bgcolor: ts.chipBg, color: ts.chipColor }}
              />
            </MenuItem>
          )}
          {BASE_ACCOUNT_ITEMS.filter((item) => isOwner || !item.ownerOnly).map((item) => (
            <ItemRow key={item.label} item={item} onClick={() => goToTab(item.tab)} />
          ))}
        </Box>

        {!isPaid && isOwner && (
          <>
            <Divider sx={{ borderColor: 'border.subtle' }} />
            <Box sx={{ py: 1 }}>
              <MenuItem sx={{ gap: 2, py: 1.25, px: 2.5 }} onClick={() => goToTab('assinatura')}>
                <WorkspacePremiumOutlined sx={{ fontSize: 18, color: 'accent.600' }} />
                <Typography variant="body2" sx={{ flex: 1, color: 'accent.800', fontWeight: 500 }}>
                  Conhecer os planos
                </Typography>
                <ArrowForwardOutlined sx={{ fontSize: 16, color: 'accent.600' }} />
              </MenuItem>
            </Box>
          </>
        )}

        <Divider sx={{ borderColor: 'border.subtle' }} />

        <Box sx={{ py: 1 }}>
          {securityItems.map((item) => (
            <ItemRow
              key={item.label}
              item={item}
              onClick={
                item.tab === 'notificacoes' && !canUseNotifications
                  ? openUpsell
                  : () => goToTab(item.tab)
              }
            />
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

      {/* Fora do Menu: o Popover desmonta os filhos ao fechar, o que fecharia a modal junto. */}
      <UpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        title="Desbloqueie as notificações"
        description="Receba alertas de estoque, despesas e agendamentos direto no app fazendo upgrade do seu plano."
      />
    </>
  )
}
