
import { MiscellaneousServicesOutlined } from "@mui/icons-material"
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined"
import BarChartOutlined from "@mui/icons-material/BarChartOutlined"
import GroupsOutlined from "@mui/icons-material/GroupsOutlined"
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined"
import PeopleOutlined from "@mui/icons-material/PeopleOutlined"
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined"
import { AccentColor } from "../../types/usersettings.type"

export type SettingsTab =
  | 'negocio'
  | 'operacao'
  | 'modulos'
  | 'pagamentos'
  | 'fiscal'
  | 'backup'
  | 'avancado'
  | 'desativados'
  | 'perfil'
  | 'assinatura'
  | 'negocios'
  | 'notificacoes'
  | 'sessoes'
  | 'integracoes'
  | 'privacy'
  | 'useterms'

// Payment Section
export type MethodKey = 'pix' | 'cardCredit' | 'cardDebit' | 'cash'

export interface MethodMeta {
  key: MethodKey
  showFees: boolean
  label: string
  subtitle: string
  icon: React.ElementType
}


// Operational Section
export interface Shortcut {
  label: string
  keys: string[]
}

export const ACCENT_COLORS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'green', label: 'Verde', hex: '#2fa040' },
  { id: 'blue', label: 'Azul', hex: '#3a82d4' },
  { id: 'orange', label: 'Laranja', hex: '#d97a1f' },
  { id: 'purple', label: 'Roxo', hex: '#9152d4' },
  { id: 'pink', label: 'Rosa', hex: '#d94576' },
  { id: 'graphite', label: 'Grafite', hex: '#4b4b4b' },
]

//backup section

export interface BackupEntry {
  id: string
  date: string
  size: string
  status: 'success' | 'failed'
}

export const EXPORT_CATEGORIES = [
  { id: 'sales', label: 'Vendas', icon: ReceiptLongOutlined },
  { id: 'products', label: 'Produtos', icon: Inventory2Outlined },
  { id: 'customers', label: 'Clientes', icon: PeopleOutlined },
  { id: 'services', label: 'Serviços', icon: MiscellaneousServicesOutlined },
  { id: 'expenses', label: 'Despesas', icon: AccountBalanceWalletOutlined },
  { id: 'billing', label: 'Faturamento', icon: BarChartOutlined },
  { id: 'team', label: 'Equipe', icon: GroupsOutlined },
]

// Tipos importáveis via CSV — subconjunto das categorias exportáveis (só entidades cadastrais).
export const IMPORT_CATEGORIES: { id: 'products' | 'customers' | 'services'; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'Produtos', icon: Inventory2Outlined },
  { id: 'customers', label: 'Clientes', icon: PeopleOutlined },
  { id: 'services', label: 'Serviços', icon: MiscellaneousServicesOutlined },
]