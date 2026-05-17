import { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

import { type SettingsTab } from './types'
import BusinessSection from './components/BusinessSection'
import OperationSection from './components/OperationSection'
import PaymentsSection from './components/PaymentsSection'
import FiscalSection from './components/FiscalSection'
import PrintingSection from './components/PrintingSection'
import AppearanceSection from './components/AppearanceSection'
import BackupSection from './components/BackupSection'
import IntegrationsSection from './components/IntegrationsSection'
import TeamSection from './components/TeamSection'
import AdvancedSection from './components/AdvancedSection'

interface NavItem {
  id: SettingsTab
  label: string
  subtitle: string
  icon: SvgIconComponent
}

const NAV_ITEMS: NavItem[] = [
  { id: 'negocio', label: 'Negócio', subtitle: 'Dados, endereço e horário', icon: StorefrontOutlinedIcon },
  { id: 'operacao', label: 'Operação / PDV', subtitle: 'Caixa, descontos, atalhos', icon: ShoppingCartOutlinedIcon },
  { id: 'pagamentos', label: 'Pagamentos', subtitle: 'Maquininhas e métodos', icon: CreditCardOutlinedIcon },
  { id: 'fiscal', label: 'Fiscal — NFC-e', subtitle: 'Notas e SEFAZ', icon: ReceiptLongOutlinedIcon },
  { id: 'impressao', label: 'Impressão', subtitle: 'Recibos e cupons', icon: PrintOutlinedIcon },
  { id: 'aparencia', label: 'Aparência', subtitle: 'Tema e densidade', icon: TuneOutlinedIcon },
  { id: 'backup', label: 'Backup & dados', subtitle: 'Exportação e retenção', icon: BackupOutlinedIcon },
  { id: 'integracoes', label: 'Integrações', subtitle: 'Conectar serviços externos', icon: SyncAltOutlinedIcon },
  { id: 'equipe', label: 'Equipe & permissões', subtitle: 'Papéis e acessos', icon: GroupOutlinedIcon },
  { id: 'avancado', label: 'Avançado', subtitle: 'Desenvolvedor e API', icon: FiberManualRecordOutlinedIcon },
]

function renderSection(tab: SettingsTab) {
  switch (tab) {
    case 'negocio': return <BusinessSection />
    case 'operacao': return <OperationSection />
    case 'pagamentos': return <PaymentsSection />
    case 'fiscal': return <FiscalSection />
    case 'impressao': return <PrintingSection />
    case 'aparencia': return <AppearanceSection />
    case 'backup': return <BackupSection />
    case 'integracoes': return <IntegrationsSection />
    case 'equipe': return <TeamSection />
    case 'avancado': return <AdvancedSection />
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('negocio')
  const current = NAV_ITEMS.find((n) => n.id === activeTab)!

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary" lineHeight={1.15}>
            Configurações
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {current.subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<HelpOutlineIcon />} size="small">
            Documentação
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} size="small">
            Baixar config
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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <Box
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
