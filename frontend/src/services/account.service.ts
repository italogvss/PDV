import { api } from './api'
import type {
  AccountDeletionPath,
  AccountDeletionPreview,
  AccountDeletionResult,
  AccountDeletionStatus,
} from '../types/account.types'

// O backend não tem JsonStringEnumConverter global, então o enum vai por número no corpo do POST.
const PATH_CODE: Record<AccountDeletionPath, number> = { DeleteNow: 0, AtPeriodEnd: 1 }

interface BackendStatus {
  pending: boolean
  requestedAt: string | null
  effectiveAt: string | null
  scheduledDeletionAt: string | null
  blocked: boolean
}

interface BackendPreview {
  subscriptionStatus: string
  currentPeriodEnd: string | null
  withinRefundWindow: boolean
  refundInProgress: boolean
  canScheduleAtPeriodEnd: boolean
  graceDays: number
}

interface BackendResult {
  effectiveAt: string
  scheduledDeletionAt: string
  subscriptionCanceled: boolean
  refundRequested: boolean
}

export const accountDeletionService = {
  // Estado corrente — acessível mesmo durante o bloqueio (allowlist do middleware).
  getStatus: async (): Promise<AccountDeletionStatus> => {
    const { data } = await api.get<BackendStatus>('/account/deletion')
    return {
      pending: data.pending ?? false,
      requestedAt: data.requestedAt ?? null,
      effectiveAt: data.effectiveAt ?? null,
      scheduledDeletionAt: data.scheduledDeletionAt ?? null,
      blocked: data.blocked ?? false,
    }
  },

  preview: async (): Promise<AccountDeletionPreview> => {
    const { data } = await api.get<BackendPreview>('/account/deletion/preview')
    return {
      subscriptionStatus: data.subscriptionStatus,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      withinRefundWindow: data.withinRefundWindow ?? false,
      refundInProgress: data.refundInProgress ?? false,
      canScheduleAtPeriodEnd: data.canScheduleAtPeriodEnd ?? false,
      graceDays: data.graceDays ?? 30,
    }
  },

  request: async (path: AccountDeletionPath): Promise<AccountDeletionResult> => {
    const { data } = await api.post<BackendResult>('/account/deletion', { path: PATH_CODE[path] })
    return {
      effectiveAt: data.effectiveAt,
      scheduledDeletionAt: data.scheduledDeletionAt,
      subscriptionCanceled: data.subscriptionCanceled ?? false,
      refundRequested: data.refundRequested ?? false,
    }
  },

  // Reativar (reverter) durante a carência.
  cancel: async (): Promise<void> => {
    await api.post('/account/deletion/cancel')
  },
}
