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
import type { OperationModule } from '../../constants/modules'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
  badge?: { label: string; tone: 'new' | 'count' }
  requiredPermission?: Permission
  // Item só aparece se o módulo estiver ativo no tenant. Sem módulo = sempre visível.
  module?: OperationModule
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operação',
    items: [
      { label: 'Inicio', path: '/', icon: SpaceDashboardOutlined },
      {
        label: 'Vender',
        path: '/vendas',
        icon: PointOfSaleOutlined,
        requiredPermission: 'SellProducts',
        module: 'sales',
      },
      {
        label: 'Histórico de vendas',
        path: '/historico',
        icon: ReceiptLongOutlined,
        requiredPermission: 'SellProducts',
        module: 'sales',
      },
      {
        label: 'Estoque',
        path: '/estoque',
        icon: Inventory2Outlined,
        requiredPermission: 'ViewStock',
        module: 'inventory',
      },
      { label: 'Serviços', path: '/servicos', icon: MiscellaneousServicesOutlined, module: 'services' },
      { label: 'Agendamentos', path: '/agendamentos', icon: CalendarMonthOutlined, module: 'appointments' },
      {
        label: 'Despesas',
        path: '/despesas',
        icon: PaidOutlined,
        requiredPermission: 'ViewExpenses',
        module: 'expenses',
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
        module: 'reports',
      },
    ],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Clientes', path: '/clientes', icon: PeopleAltOutlined, module: 'customers' },
      { label: 'Fornecedores', path: '/fornecedores', icon: LocalShippingOutlined, module: 'suppliers' },
      { label: 'Configurações', path: '/configuracoes', icon: SettingsOutlined },
      { label: 'Ajuda', path: '/ajuda', icon: HelpOutlineOutlined },
      
    ],
  },
]

export const DRAWER_WIDTH = 260
export const TOPBAR_HEIGHT = 64
