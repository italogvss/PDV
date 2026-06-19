import { api } from './api'

interface WebhookEventRow {
  id: string
  provider: string
  eventId: string
  eventType: string
  status: string
  receivedAt: string
  processedAt: string | null
  error: string | null
}

interface PaginatedWebhookEvents {
  data: WebhookEventRow[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface SubscriptionRow {
  id: string
  userEmail: string
  userName: string
  planName: string
  status: string
  method: string
  provider: string
  isRenewable: boolean
  gatewaySubscriptionId: string | null
  gatewayCustomerId: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  createdAt: string
}

interface PaymentRow {
  id: string
  userEmail: string
  userName: string
  gatewayChargeId: string
  kind: string
  method: string
  amountCents: number
  status: string
  provider: string
  couponCode: string | null
  paidAt: string | null
  periodStart: string | null
  periodEnd: string | null
  receiptUrl: string | null
  createdAt: string
}

export interface AdminConfig {
  apiKey: string
  webhookSecret: string
  baseUrl: string
  backUrl: string | null
}

export interface SimulatePixResult {
  id: string
  status: string | null
}

export type { WebhookEventRow, PaginatedWebhookEvents, SubscriptionRow, PaymentRow }

export interface WebhookFilters {
  page?: number
  pageSize?: number
  status?: string
  eventType?: string
}

export const adminService = {
  getWebhookEvents: async (filters: WebhookFilters = {}): Promise<PaginatedWebhookEvents> => {
    const { data } = await api.get('/admin/webhook-events', { params: filters })
    return data
  },

  getSubscriptions: async (): Promise<SubscriptionRow[]> => {
    const { data } = await api.get('/admin/subscriptions')
    return data
  },

  getPayments: async (): Promise<PaymentRow[]> => {
    const { data } = await api.get('/admin/payments')
    return data
  },

  getConfig: async (): Promise<AdminConfig> => {
    const { data } = await api.get('/admin/config')
    return data
  },

  simulatePix: async (pixChargeId: string): Promise<SimulatePixResult> => {
    const { data } = await api.post('/admin/test/simulate-pix', { pixChargeId })
    return data
  },
}
