import {
  SpaceDashboardOutlined,
  WorkspacePremiumOutlined,
  PaidOutlined,
  LayersOutlined,
  WebhookOutlined,
  SupportAgentOutlined,
  CampaignOutlined,
  MonitorHeartOutlined,
  GavelOutlined,
} from '@mui/icons-material'
import type { NavSection } from '../../layouts/DashboardLayout/constants'

// Reaproveita as dimensões do shell de loja para manter a mesma proporção visual.
export { DRAWER_WIDTH, TOPBAR_HEIGHT } from '../../layouts/DashboardLayout/constants'

// Sidenav da área de administração. Reusa o tipo NavItem/NavSection do shell de loja, mas sem os
// campos de gating de loja (module/requiredPermission/ownerOnly) — o acesso ao /admin é decidido
// só pelo RouterGuard type="admin" (role Admin).
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Visão geral', path: '/admin', icon: SpaceDashboardOutlined },
      { label: 'Assinaturas', path: '/admin/assinaturas', icon: WorkspacePremiumOutlined },
      { label: 'Pagamentos', path: '/admin/pagamentos', icon: PaidOutlined },
      { label: 'Planos', path: '/admin/planos', icon: LayersOutlined },
      { label: 'Webhooks', path: '/admin/webhooks', icon: WebhookOutlined },
      { label: 'Suporte', path: '/admin/suporte', icon: SupportAgentOutlined },
      { label: 'Anúncios', path: '/admin/anuncios', icon: CampaignOutlined },
      { label: 'Conformidade', path: '/admin/conformidade', icon: GavelOutlined },
      { label: 'Observabilidade', path: '/admin/observabilidade', icon: MonitorHeartOutlined },
    ],
  },
]
