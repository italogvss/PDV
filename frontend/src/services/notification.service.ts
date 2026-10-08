import { api } from './api'
import { NOTIFICATION_DEFS } from '../constants/notifications'
import type { NotificationCount, NotificationItem } from '../types/notification.types'

interface BackendNotifications {
  items: NotificationCount[]
}

// Junta a contagem do backend com a definição de apresentação. Chave sem definição é
// descartada — permite subir o backend com uma notificação nova antes do frontend.
function mapItem({ key, count }: NotificationCount): NotificationItem | null {
  const def = NOTIFICATION_DEFS[key]
  if (!def) return null

  return {
    key,
    count,
    severity: def.severity,
    icon: def.icon,
    title: def.title,
    description: def.describe(count),
    route: def.route,
  }
}

export const notificationService = {
  get: async (): Promise<NotificationItem[]> => {
    const { data } = await api.get<BackendNotifications>('/notifications')
    return (data.items ?? []).map(mapItem).filter((item): item is NotificationItem => item !== null)
  },
}
