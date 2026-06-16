import { api } from './api'
import type { NotificationCounts } from '../types/notification.types'

export const notificationService = {
  get: async (): Promise<NotificationCounts> => {
    const { data } = await api.get<NotificationCounts>('/notifications')
    return data
  },
}
