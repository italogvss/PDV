import type { SvgIconComponent } from '@mui/icons-material'

export type NotificationSeverity = 'error' | 'warning' | 'info'

// O que o backend devolve (GET /api/notifications): só a chave e a contagem.
export interface NotificationCount {
  key: string
  count: number
}

// Notificação pronta para renderizar — junção de NotificationCount com a definição de
// apresentação de constants/notifications.ts.
export interface NotificationItem {
  key: string
  count: number
  severity: NotificationSeverity
  icon: SvgIconComponent
  title: string
  description: string
  route: string
}
