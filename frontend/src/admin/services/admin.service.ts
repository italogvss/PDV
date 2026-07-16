import { api } from '../../services/api'
import type {
  AdminAccessLog,
  AdminAccountDeletion,
  AdminAnnouncement,
  AdminConfig,
  AdminContactMessage,
  AdminHealth,
  AdminOverview,
  AdminPaginated,
  AdminPayment,
  AdminPlan,
  AdminPlatformEvent,
  AdminRetentionTenant,
  AdminSubscription,
  AdminSystemLog,
  AdminWebhookEvent,
  AnnouncementPayload,
  UpdatePlanPayload,
} from '../types/admin.types'

// Cliente da API de admin. Usa o `api` compartilhado (cookie de sessão + refresh); o admin não tem
// tenant, então o interceptor não injeta X-Tenant-Id — os endpoints de admin não dependem disso.
export const adminService = {
  getOverview: async (): Promise<AdminOverview> => {
    const { data } = await api.get<AdminOverview>('/admin/overview')
    return data
  },

  getSubscriptions: async (): Promise<AdminSubscription[]> => {
    const { data } = await api.get<AdminSubscription[]>('/admin/subscriptions')
    return data
  },

  getPayments: async (): Promise<AdminPayment[]> => {
    const { data } = await api.get<AdminPayment[]>('/admin/payments')
    return data
  },

  getPlans: async (): Promise<AdminPlan[]> => {
    const { data } = await api.get<AdminPlan[]>('/admin/plans')
    return data
  },

  updatePlan: async (id: string, payload: UpdatePlanPayload): Promise<AdminPlan> => {
    const { data } = await api.put<AdminPlan>(`/admin/plans/${id}`, payload)
    return data
  },

  deactivatePlan: async (id: string): Promise<void> => {
    await api.delete(`/admin/plans/${id}`)
  },

  getWebhookEvents: async (
    page = 1,
    pageSize = 200,
    status?: string,
    eventType?: string,
  ): Promise<AdminPaginated<AdminWebhookEvent>> => {
    const { data } = await api.get<AdminPaginated<AdminWebhookEvent>>('/admin/webhook-events', {
      params: { page, pageSize, status: status || undefined, eventType: eventType || undefined },
    })
    return data
  },

  getConfig: async (): Promise<AdminConfig> => {
    const { data } = await api.get<AdminConfig>('/admin/config')
    return data
  },

  // ── Fase 3: Suporte & Conteúdo ──────────────────────────────────────────────────────────────

  getContactMessages: async (): Promise<AdminContactMessage[]> => {
    const { data } = await api.get<AdminContactMessage[]>('/admin/contact-messages')
    return data
  },

  updateContactStatus: async (id: string, status: string): Promise<AdminContactMessage> => {
    const { data } = await api.patch<AdminContactMessage>(`/admin/contact-messages/${id}/status`, { status })
    return data
  },

  getAnnouncements: async (): Promise<AdminAnnouncement[]> => {
    const { data } = await api.get<AdminAnnouncement[]>('/admin/announcements')
    return data
  },

  createAnnouncement: async (payload: AnnouncementPayload): Promise<AdminAnnouncement> => {
    const { data } = await api.post<AdminAnnouncement>('/admin/announcements', payload)
    return data
  },

  updateAnnouncement: async (id: string, payload: AnnouncementPayload): Promise<AdminAnnouncement> => {
    const { data } = await api.put<AdminAnnouncement>(`/admin/announcements/${id}`, payload)
    return data
  },

  deactivateAnnouncement: async (id: string): Promise<void> => {
    await api.delete(`/admin/announcements/${id}`)
  },

  // ── Fase 4: Observabilidade ─────────────────────────────────────────────────────────────────

  getHealth: async (): Promise<AdminHealth> => {
    const { data } = await api.get<AdminHealth>('/admin/health')
    return data
  },

  getSystemLogs: async (level?: string): Promise<AdminPaginated<AdminSystemLog>> => {
    const { data } = await api.get<AdminPaginated<AdminSystemLog>>('/admin/system-logs', {
      params: { page: 1, pageSize: 200, level: level || undefined },
    })
    return data
  },

  getPlatformEvents: async (source?: string): Promise<AdminPaginated<AdminPlatformEvent>> => {
    const { data } = await api.get<AdminPaginated<AdminPlatformEvent>>('/admin/platform-events', {
      params: { page: 1, pageSize: 200, source: source || undefined },
    })
    return data
  },

  // ── Conformidade / LGPD ─────────────────────────────────────────────────────────────────────

  getAccountDeletions: async (): Promise<AdminAccountDeletion[]> => {
    const { data } = await api.get<AdminAccountDeletion[]>('/admin/account-deletions')
    return data
  },

  getRetentionTenants: async (): Promise<AdminRetentionTenant[]> => {
    const { data } = await api.get<AdminRetentionTenant[]>('/admin/retention-tenants')
    return data
  },

  getAccessLogs: async (): Promise<AdminPaginated<AdminAccessLog>> => {
    const { data } = await api.get<AdminPaginated<AdminAccessLog>>('/admin/access-logs', {
      params: { page: 1, pageSize: 200 },
    })
    return data
  },
}
