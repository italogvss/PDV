import { Box, Typography, Button } from '@mui/material'
import { useSearchParams, useNavigate } from 'react-router-dom'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import { HelpOutlineOutlined, PersonOutlineOutlined, type SvgIconComponent } from '@mui/icons-material'
import { useAppDispatch } from '../../store'
import { clearAuth } from '../../store/slices/auth.slice'
import type { AccountTab } from './types'
import ProfileSection from './components/ProfileSection'
import SubscriptionSection from './components/SubscriptionSection'
import BillingPaymentsSection from './components/BillingPaymentsSection'
import InvoicesSection from './components/InvoicesSection'
import BusinessesSection from './components/BusinessesSection'
import SecuritySection from './components/SecuritySection'
import NotificationsSection from './components/NotificationsSection'
import SessionsSection from './components/SessionsSection'
import IntegrationsSection from './components/IntegrationsSection'

interface NavItem {
  id: AccountTab
  label: string
  icon: SvgIconComponent
}

const NAV_ITEMS: NavItem[] = [
  { id: 'perfil', label: 'Meu perfil', icon: PersonOutlineOutlined },
  { id: 'assinatura', label: 'Assinatura', icon: WorkspacePremiumOutlinedIcon },
//{ id: 'pagamentos', label: 'Pagamentos', icon: CreditCardOutlinedIcon },
//{ id: 'faturas', label: 'Faturas', icon: DescriptionOutlinedIcon },
  { id: 'negocios', label: 'Meus negócios', icon: StorefrontOutlinedIcon },
  { id: 'seguranca', label: 'Segurança', icon: SecurityOutlinedIcon },
  { id: 'notificacoes', label: 'Notificações', icon: NotificationsNoneOutlinedIcon },
//{ id: 'sessoes', label: 'Sessões', icon: VisibilityOutlinedIcon },
//{ id: 'integracoes', label: 'Integrações', icon: SyncAltOutlinedIcon },
]

function renderSection(tab: AccountTab) {
  switch (tab) {
    case 'perfil': return <ProfileSection />
    case 'assinatura': return <SubscriptionSection />
    case 'pagamentos': return <BillingPaymentsSection />
    case 'faturas': return <InvoicesSection />
    case 'negocios': return <BusinessesSection />
    case 'seguranca': return <SecuritySection />
    case 'notificacoes': return <NotificationsSection />
    case 'sessoes': return <SessionsSection />
    case 'integracoes': return <IntegrationsSection />
  }
}

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const rawTab = searchParams.get('tab') as AccountTab | null
  const activeTab: AccountTab = NAV_ITEMS.some((n) => n.id === rawTab) ? rawTab! : 'perfil'

  const handleTabChange = (tab: AccountTab) => {
    setSearchParams({ tab })
  }

  const handleLogout = () => {
    dispatch(clearAuth())
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.15 }} color="text.primary">
            Conta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
            Gerencie seu perfil, plano e preferências
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<HelpOutlineOutlined />} size="small">
          Central de ajuda
        </Button>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', gap: 4, flex: 1, minHeight: 0 }}>
        {/* Sidebar nav */}
        <Box
          component="nav"
          sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <Box
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: active ? 'text.primary' : 'text.secondary',
                  bgcolor: active ? 'background.paper' : 'transparent',
                  boxShadow: active ? (t) => t.customShadows.xs : 'none',
                  border: 1,
                  borderColor: active ? 'border.subtle' : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    bgcolor: active ? 'background.paper' : 'surface.raised',
                    color: 'text.primary',
                  },
                }}
              >
                <Icon sx={{ fontSize: 18, color: active ? 'text.primary' : 'text.tertiary', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: active ? 600 : 500, color: 'inherit' }}>
                  {item.label}
                </Typography>
              </Box>
            )
          })}

          {/* Sair da conta */}
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={handleLogout}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                userSelect: 'none',
                color: 'error.main',
                '&:hover': { bgcolor: 'error.soft' },
                transition: 'background-color 0.15s',
              }}
            >
              <ArrowForwardOutlinedIcon sx={{ fontSize: 18, color: 'error.main', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'inherit' }}>
                Sair da conta
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            pb: 4,
          }}
        >
          {renderSection(activeTab)}
        </Box>
      </Box>
    </Box>
  )
}
