import AttachMoney from "@mui/icons-material/AttachMoney"
import CreditCard from "@mui/icons-material/CreditCard"
import Pix from "@mui/icons-material/Pix"
import { PaymentsSettings } from "../../types/settings.types"
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined"
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined"
import PeopleOutlined from "@mui/icons-material/PeopleOutlined"
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined"
import BarChartOutlined from "@mui/icons-material/BarChartOutlined"
import GroupsOutlined from "@mui/icons-material/GroupsOutlined"
import { AccentColor } from "../../types/usersettings.type"
import { MiscellaneousServicesOutlined } from "@mui/icons-material"

export type SettingsTab =
  | 'negocio'
  | 'operacao'
  | 'pagamentos'
  | 'fiscal'
  | 'aparencia'
  | 'backup'
  | 'avancado'
  | 'desativados'
  | 'perfil'
  | 'assinatura'
  | 'faturas'
  | 'negocios'
  | 'seguranca'
  | 'notificacoes'
  | 'sessoes'
  | 'integracoes'

  // Payment Section
export type MethodKey = keyof PaymentsSettings

export interface MethodMeta {
  key: MethodKey
  showFees: boolean
  label: string
  subtitle: string
  icon: React.ElementType
}

export const PAYMENT_METHODS: MethodMeta[] = [
  { key: 'pix', showFees: false,label: 'Pix', subtitle: 'Sem taxa', icon: Pix },
  { key: 'cardCredit', showFees: true,label: 'Cartão crédito', subtitle: 'Taxa média 3,2%', icon: CreditCard },
  { key: 'cardDebit', showFees: true,label: 'Cartão débito', subtitle: 'Taxa 1,5%', icon: CreditCard },
  { key: 'cash', showFees: false,label: 'Dinheiro', subtitle: 'Sem taxa', icon: AttachMoney },
]


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

export const SHORTCUTS: Shortcut[] = [
  { label: 'Nova venda', keys: ['F2'] },
  { label: 'Buscar produto', keys: ['F3'] },
  { label: 'Aplicar desconto', keys: ['F6'] },
  { label: 'Finalizar venda', keys: ['F8'] },
  { label: 'Cancelar item', keys: ['Del'] },
  { label: 'Pagamento Pix', keys: ['⌘', 'P'] },
  { label: 'Pagamento Crédito', keys: ['⌘', 'C'] },
  { label: 'Imprimir cupom', keys: ['⌘', 'I'] },
]

//backup section

export interface BackupEntry {
  id: string
  date: string
  size: string
  status: 'success' | 'failed'
}

export const BACKUPS: BackupEntry[] = [
  { id: '1', date: '14/05/2026 03:00', size: '24.8 MB', status: 'success' },
  { id: '2', date: '13/05/2026 03:00', size: '24.6 MB', status: 'success' },
  { id: '3', date: '12/05/2026 03:00', size: '24.4 MB', status: 'success' },
  { id: '4', date: '11/05/2026 03:00', size: '—', status: 'failed' },
  { id: '5', date: '10/05/2026 03:00', size: '23.9 MB', status: 'success' },
]

export const EXPORT_CATEGORIES = [
  { id: 'sales', label: 'Vendas', icon: ReceiptLongOutlined },
  { id: 'products', label: 'Produtos', icon: Inventory2Outlined },
  { id: 'customers', label: 'Clientes', icon: PeopleOutlined },
  { id: 'services', label: 'Serviços', icon: MiscellaneousServicesOutlined },
  { id: 'expenses', label: 'Despesas', icon: AccountBalanceWalletOutlined },
  { id: 'billing', label: 'Faturamento', icon: BarChartOutlined },
  { id: 'team', label: 'Equipe', icon: GroupsOutlined },
]