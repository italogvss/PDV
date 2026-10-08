import type { NotificationItem } from '../../../../types/notification.types'

export type TabValue = 'todas' | 'nao-lidas'

export interface Props {
  open: boolean
  onClose: () => void
  /** Itens já prontos, vindos do NotificationButton — o painel não refaz a query. */
  items: NotificationItem[]
  isLoading: boolean
  isError: boolean
  readKeys: Set<string>
  onMarkRead: (key: string) => void
  onMarkAllRead: () => void
}
