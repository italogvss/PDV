import { BackupOutlined, CreditCardOutlined, FiberManualRecordOutlined, HelpOutlined, NotificationsNoneOutlined, PersonOutlineOutlined, ReceiptLongOutlined, SecurityOutlined, ShoppingCartOutlined, StorefrontOutlined, WorkspacePremiumOutlined, type SvgIconComponent } from '@mui/icons-material'
import TuneOutlined from '@mui/icons-material/TuneOutlined'
import { Box, Button, Divider, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../../store'
import AdvancedSection from './components/AdvancedSection'
import AppearanceSection from './components/AppearanceSection'
import BackupSection from './components/BackupSection'
import BillingPaymentsSection from './components/BillingPaymentsSection'
import BusinessSection from './components/BusinessSection'
import BusinessesSection from './components/BusinessesSection'
import FiscalSection from './components/FiscalSection'
import NotificationsSection from './components/NotificationsSection'
import OperationSection from './components/OperationSection'
import PaymentsSection from './components/PaymentsSection'
import ProfileSection from './components/ProfileSection'
import SecuritySection from './components/SecuritySection'
import SubscriptionSection from './components/SubscriptionSection'
import { type SettingsTab } from './types'

interface NavItem {
  id: SettingsTab
  label: string
  subtitle: string
  icon: SvgIconComponent
  type: 'business' | 'user'
  ownerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  // ── Pessoal ──
  { id: 'perfil',       label: 'Meu perfil',     subtitle: 'Informações pessoais',        icon: PersonOutlineOutlined,     type: 'user' },
  { id: 'assinatura',   label: 'Assinatura',     subtitle: 'Planos e cobranças',          icon: WorkspacePremiumOutlined,  type: 'user', ownerOnly: true },
  { id: 'faturas',      label: 'Faturas',        subtitle: 'Métodos e histórico',         icon: CreditCardOutlined,        type: 'user', ownerOnly: true },
  { id: 'seguranca',    label: 'Segurança',      subtitle: 'Autenticação e privacidade',  icon: SecurityOutlined,          type: 'user' },
  { id: 'negocios',     label: 'Meus negócios',  subtitle: 'Gerenciamento de empresas',   icon: StorefrontOutlined,        type: 'user', ownerOnly: true  },
  { id: 'aparencia',    label: 'Aparência',      subtitle: 'Estilo e temas',              icon: TuneOutlined,              type: 'user' },
  { id: 'notificacoes', label: 'Notificações',   subtitle: 'Preferências de comunicação', icon: NotificationsNoneOutlined, type: 'user' },
  // ── Negócio ──
  { id: 'negocio',    label: 'Negócio',        subtitle: 'Dados, endereço e horário', icon: StorefrontOutlined,        type: 'business' },
  { id: 'operacao',   label: 'Operação',       subtitle: 'Caixa, descontos, atalhos', icon: ShoppingCartOutlined,      type: 'business' },
  { id: 'pagamentos', label: 'Pagamentos',     subtitle: 'Maquininhas e métodos',     icon: CreditCardOutlined,        type: 'business' },
  { id: 'fiscal',     label: 'Fiscal — NFC-e', subtitle: 'Notas e SEFAZ',            icon: ReceiptLongOutlined,       type: 'business' },
  { id: 'backup',     label: 'Backup & dados', subtitle: 'Exportação e retenção',    icon: BackupOutlined,            type: 'business' },
  { id: 'avancado',   label: 'Avançado',       subtitle: 'Desenvolvedor e API',      icon: FiberManualRecordOutlined, type: 'business' },
]

function renderSection(tab: SettingsTab) {
  switch (tab) {
    case 'negocio':      return <BusinessSection />
    case 'operacao':     return <OperationSection />
    case 'pagamentos':   return <PaymentsSection />
    case 'fiscal':       return <FiscalSection />
    case 'aparencia':    return <AppearanceSection />
    case 'backup':       return <BackupSection />
    case 'avancado':     return <AdvancedSection />
    case 'perfil':       return <ProfileSection />
    case 'assinatura':   return <SubscriptionSection />
    case 'faturas':      return <BillingPaymentsSection />
    case 'negocios':     return <BusinessesSection />
    case 'seguranca':    return <SecuritySection />
    case 'notificacoes': return <NotificationsSection />
    default:             return null
  }
}

export default function SettingsPage() {
  const { role } = useAppSelector((s) => s.auth)
  const isOwner = role === 'Owner'

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isOwner) return true
    return item.type === 'user' && !item.ownerOnly
  })

  const defaultTab: SettingsTab = isOwner ? 'negocio' : 'perfil'

  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as SettingsTab | null
  const activeTab = visibleItems.some((n) => n.id === rawTab) ? rawTab! : defaultTab

  const current = visibleItems.find((n) => n.id === activeTab) ?? visibleItems[0]

  const handleTabChange = (tab: SettingsTab) => {
    setSearchParams({ tab }, { replace: true })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" color="text.primary" sx={{ lineHeight: 1.15, fontWeight: 700 }}>
            Configurações
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {current?.subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<HelpOutlined />} size="small">
            Precisa de ajuda?
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', gap: 4, flex: 1, minHeight: 0 }}>
        {/* Sidebar nav */}
        <Box
          component="nav"
          sx={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {visibleItems.map((item, index) => {
            const Icon = item.icon
            const active = activeTab === item.id
            const isFirstOfGroup = index === 0 || visibleItems[index - 1].type !== item.type

            return (
              <Box key={item.id}>
                {isFirstOfGroup && (
                  <>
                    {index > 0 && <Divider sx={{ borderColor: 'border.subtle', my: 1 }} />}
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        px: 2,
                        py: 0.5,
                        color: 'text.tertiary',
                        fontWeight: 600,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.type === 'user' ? 'Pessoal' : 'Negócio'}
                    </Typography>
                  </>
                )}
                <Box
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
                  <Icon
                    sx={{
                      fontSize: 18,
                      color: active ? 'text.primary' : 'text.tertiary',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: active ? 600 : 500,
                      color: 'inherit',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            )
          })}
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
