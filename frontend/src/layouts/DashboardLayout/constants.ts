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
  CalendarMonthOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import type { Permission } from '../../types/employee.types'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
  badge?: { label: string; tone: 'new' | 'count' }
  requiredPermission?: Permission
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
        requiredPermission: 'SellProducts',
      },
      {
        label: 'Histórico de vendas',
        path: '/historico',
        icon: ReceiptLongOutlined,
        requiredPermission: 'SellProducts',
      },
      {
        label: 'Estoque',
        path: '/estoque',
        icon: Inventory2Outlined,
        badge: { label: '3', tone: 'count' },
        requiredPermission: 'ViewStock',
      },
      { label: 'Serviços', path: '/servicos', icon: MiscellaneousServicesOutlined },
      { label: 'Agendamentos', path: '/agendamentos', icon: CalendarMonthOutlined },
      {
        label: 'Despesas',
        path: '/despesas',
        icon: PaidOutlined,
        requiredPermission: 'ViewExpenses',
      },
      {
        label: 'Funcionários',
        path: '/funcionarios',
        icon: GroupOutlined,
        requiredPermission: 'ManageEmployees',
      },
      {
        label: 'Lucros & relatórios',
        path: '/relatorios',
        icon: InsightsOutlined,
        requiredPermission: 'ViewReports',
      },
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
