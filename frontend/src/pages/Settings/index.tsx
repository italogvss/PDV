import { ArchiveOutlined, Article, BackupOutlined, CloseRounded, CreditCardOutlined, ExtensionOutlined, FiberManualRecordOutlined, HelpOutlined, MenuRounded, NotificationsNoneOutlined, PersonOutlineOutlined, Shield, ShoppingCartOutlined, StorefrontOutlined, WorkspacePremiumOutlined, type SvgIconComponent } from '@mui/icons-material'
import { Box, Button, Divider, Drawer, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../../store'
import AdvancedSection from './components/AdvancedSection'
import DisabledItemsSection from './components/DisabledItemsSection'
import BackupSection from './components/BackupSection'
import BusinessSection from './components/BusinessSection'
import BusinessesSection from './components/BusinessesSection'
import FiscalSection from './components/FiscalSection'
import ModulosSection from './components/ModulosSection'
import NotificationsSection from './components/NotificationsSection'
import OperationSection from './components/OperationSection'
import PaymentsSection from './components/PaymentsSection'
import ProfileSection from './components/ProfileSection'
import SubscriptionSection from './components/SubscriptionSection'
import { type SettingsTab } from './types'
import PrivacySection from './components/PrivacySection'
import UseTermsSection from './components/UseTermsSection'

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
  { id: 'perfil',       label: 'Meu perfil',     subtitle: 'Informações pessoais, senha e aparência', icon: PersonOutlineOutlined,     type: 'user' },
  { id: 'assinatura',   label: 'Assinatura',     subtitle: 'Planos e cobranças',          icon: WorkspacePremiumOutlined,  type: 'user', ownerOnly: true },
  { id: 'negocios',     label: 'Meus negócios',  subtitle: 'Gerenciamento de empresas',   icon: StorefrontOutlined,        type: 'user', ownerOnly: true  },
  { id: 'notificacoes', label: 'Notificações',   subtitle: 'Preferências de comunicação', icon: NotificationsNoneOutlined, type: 'user' },
  { id: 'privacy', label: 'Privacidade',   subtitle: 'Preferências de privacidade', icon: Shield, type: 'user' },
  { id: 'useterms', label: 'Termos de Uso',   subtitle: 'Termos de uso e contrato da aplicação', icon: Article, type: 'user' },

  // ── Negócio ──
  { id: 'negocio',    label: 'Este Negócio',        subtitle: 'Dados, endereço e horário', icon: StorefrontOutlined,        type: 'business' },
  { id: 'operacao',   label: 'Regras',       subtitle: 'Caixa, descontos, atalhos', icon: ShoppingCartOutlined,      type: 'business' },
  { id: 'modulos',    label: 'Módulos',        subtitle: 'Ative os módulos usados pela loja', icon: ExtensionOutlined, type: 'business', ownerOnly: true },
  //{ id: 'fiscal',     label: 'Fiscal — NFC-e', subtitle: 'Notas e SEFAZ',            icon: ReceiptLongOutlined,       type: 'business' },
  { id: 'pagamentos', label: 'Pagamentos', subtitle: 'Métodos de Pagamento', icon: CreditCardOutlined, type: 'business', ownerOnly: true},
  { id: 'backup',      label: 'Backup & dados',    subtitle: 'Exportação e retenção',         icon: BackupOutlined,            type: 'business' },
  { id: 'desativados', label: 'Itens desativados', subtitle: 'Restaurar ou excluir itens',    icon: ArchiveOutlined,           type: 'business', ownerOnly: true },
  { id: 'avancado',    label: 'Avançado',          subtitle: 'Desenvolvedor e API',           icon: FiberManualRecordOutlined, type: 'business' },
]

function renderSection(tab: SettingsTab) {
  switch (tab) {
    case 'negocio':      return <BusinessSection />
    case 'operacao':     return <OperationSection />
    case 'modulos':      return <ModulosSection />
    case 'pagamentos':   return <PaymentsSection />
    case 'fiscal':       return <FiscalSection />
    case 'backup':       return <BackupSection />
    case 'desativados':  return <DisabledItemsSection />
    case 'avancado':     return <AdvancedSection />
    case 'perfil':       return <ProfileSection />
    case 'assinatura':   return <SubscriptionSection />
    case 'negocios':     return <BusinessesSection />
    case 'notificacoes': return <NotificationsSection />
    case 'privacy':      return <PrivacySection/>
    case 'useterms':     return <UseTermsSection/>
    default:             return null
  }
}

export default function SettingsPage() {
  const { role } = useAppSelector((s) => s.auth)
  const isOwner = (role === 'Owner' || role === 'Admin')
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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
    setMobileNavOpen(false)
  }

  const navList = (
    <>
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
                  {item.type === 'user' ? 'Configurações da Conta' : 'Configurações do negócio'}
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
    </>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          
          <Box>
            <Typography variant="h4" color="text.primary" sx={{ lineHeight: 1.15, fontWeight: 700 }}>
              Configurações
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {current?.subtitle}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isMobile ? (
            <IconButton
              onClick={() => setMobileNavOpen(true)}
              size="small"
              sx={{
                color: 'text.primary',
                border: 1,
                borderColor: 'border.subtle',
                borderRadius: 2,
                bgcolor: 'background.paper',
                width: 36,
                height: 36,
                flexShrink: 0,
              }}
            >
              <MenuRounded sx={{ fontSize: 20 }} />
            </IconButton>
          ) : (
            <Button onClick={()=> navigate('/ajuda?cat=configuracoes-do-negocio&art=dados-da-empresa')} variant="outlined" startIcon={<HelpOutlined />} size="small">
            Precisa de ajuda?
          </Button> 
          )}
                   
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', gap: 4, flex: 1, minHeight: 0 }}>
        {/* Sidebar nav (desktop) */}
        {!isMobile && (
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
            {navList}
          </Box>
        )}

        {/* Sidebar nav (mobile, fullscreen) */}
        <Drawer
          anchor="left"
          open={isMobile && mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              bgcolor: 'background.default',
              p: 3,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton
              onClick={() => setMobileNavOpen(false)}
              size="small"
              sx={{
                color: 'text.primary',
                border: 1,
                borderColor: 'border.subtle',
                borderRadius: 2,
                bgcolor: 'background.paper',
                width: 36,
                height: 36,
              }}
            >
              <CloseRounded sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto' }}>
            {navList}
          </Box>
        </Drawer>

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
