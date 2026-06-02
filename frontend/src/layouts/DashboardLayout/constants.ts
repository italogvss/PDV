import {
  SpaceDashboardOutlined,
  PointOfSaleOutlined,
  ReceiptLongOutlined,
  Inventory2Outlined,
  PaidOutlined,
  GroupOutlined,
  InsightsOutlined,
  PeopleAltOutlined,
  LocalShippingOutlined,
  SettingsOutlined,
  HelpOutlineOutlined,
  MiscellaneousServicesOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
  badge?: { label: string; tone: 'new' | 'count' }
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operação',
    items: [
      { label: 'Dashboard', path: '/', icon: SpaceDashboardOutlined },
      {
        label: 'PDV — Vendas',
        path: '/vendas',
        icon: PointOfSaleOutlined,
        badge: { label: 'Novo', tone: 'new' },
      },
      { label: 'Histórico de vendas', path: '/historico', icon: ReceiptLongOutlined },
      {
        label: 'Estoque',
        path: '/estoque',
        icon: Inventory2Outlined,
        badge: { label: '3', tone: 'count' },
      },
      { label: 'Serviços', path: '/servicos', icon: MiscellaneousServicesOutlined },
      { label: 'Despesas', path: '/despesas', icon: PaidOutlined },
      { label: 'Funcionários', path: '/funcionarios', icon: GroupOutlined },
      { label: 'Lucros & relatórios', path: '/relatorios', icon: InsightsOutlined },
    ],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Clientes', path: '/clientes', icon: PeopleAltOutlined },
      { label: 'Fornecedores', path: '/fornecedores', icon: LocalShippingOutlined },
      { label: 'Configurações', path: '/configuracoes', icon: SettingsOutlined },
      { label: 'Ajuda', path: '/ajuda', icon: HelpOutlineOutlined },
    ],
  },
]

export const DRAWER_WIDTH = 260
export const TOPBAR_HEIGHT = 64
