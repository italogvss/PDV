import {
  AccountBalanceWalletOutlined,
  CalendarTodayOutlined,
  ErrorOutlined,
  RemoveShoppingCartOutlined,
  ScheduleOutlined,
  TrendingDownOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import type { NotificationSeverity } from '../types/notification.types'

// Espelho das chaves de PDV.Domain/Constants/NotificationCatalog.cs. O backend decide QUANDO
// uma notificação aparece e com que contagem; aqui fica só a apresentação (ícone, cor, rota e
// texto PT-BR), seguindo a divisão de responsabilidade dos demais catálogos.
//
// Adicionar uma notificação = 1 entrada aqui + 1 regra no backend. Chave que chegue sem
// definição é ignorada pelo service, então o backend pode subir primeiro.
export interface NotificationDef {
  severity: NotificationSeverity
  icon: SvgIconComponent
  title: string
  /** Descrição já flexionada para a contagem recebida. */
  describe: (count: number) => string
  route: string
}

const plural = (n: number, singular: string, pluralForm: string) =>
  `${n} ${n === 1 ? singular : pluralForm}`

export const NOTIFICATION_DEFS: Record<string, NotificationDef> = {
  'stock.out': {
    severity: 'error',
    icon: RemoveShoppingCartOutlined,
    title: 'Produtos sem estoque',
    describe: (n) => `${plural(n, 'produto', 'produtos')} sem estoque`,
    route: '/estoque',
  },
  'stock.critical': {
    severity: 'error',
    icon: ErrorOutlined,
    title: 'Estoque crítico',
    describe: (n) => `${plural(n, 'produto', 'produtos')} em nível crítico`,
    route: '/estoque',
  },
  'stock.low': {
    severity: 'warning',
    icon: WarningAmberOutlined,
    title: 'Estoque baixo',
    describe: (n) => `${plural(n, 'produto', 'produtos')} com estoque baixo`,
    route: '/estoque',
  },
  'stock.negative': {
    severity: 'error',
    icon: TrendingDownOutlined,
    title: 'Estoque negativo',
    describe: (n) => `${plural(n, 'produto', 'produtos')} com estoque negativo`,
    route: '/estoque',
  },
  'expenses.overdue': {
    severity: 'error',
    icon: AccountBalanceWalletOutlined,
    title: 'Despesas vencidas',
    describe: (n) => plural(n, 'despesa vencida', 'despesas vencidas'),
    route: '/despesas',
  },
  'expenses.dueToday': {
    severity: 'warning',
    icon: ScheduleOutlined,
    title: 'Despesas vencem hoje',
    describe: (n) => `${plural(n, 'despesa vence', 'despesas vencem')} hoje`,
    route: '/despesas',
  },
  'credit.overdue': {
    severity: 'error',
    icon: AccountBalanceWalletOutlined,
    title: 'Crediário vencido',
    describe: (n) => `${plural(n, 'parcela vencida', 'parcelas vencidas')} de clientes`,
    route: '/crediario',
  },
  'credit.dueThisMonth': {
    severity: 'warning',
    icon: ScheduleOutlined,
    title: 'Crediário a vencer',
    describe: (n) => `${plural(n, 'parcela vence', 'parcelas vencem')} ainda neste mês`,
    route: '/crediario',
  },
  'appointments.today': {
    severity: 'info',
    icon: CalendarTodayOutlined,
    title: 'Agendamentos hoje',
    describe: (n) => `${plural(n, 'agendamento', 'agendamentos')} para hoje`,
    route: '/agendamentos',
  },
}
