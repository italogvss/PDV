import { api } from './api'
import type { AuditLogRow, AuditLogFilters } from '../types/audit.types'

interface PagedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

// O backend já devolve `details` desserializado (objeto JSON ou null) e os enums como
// strings, então a linha do backend tem o mesmo formato de AuditLogRow.
type BackendAuditLog = AuditLogRow

export const logsService = {
  getAuditLogs: async (filters: AuditLogFilters): Promise<AuditLogRow[]> => {
    const { data } = await api.get<PagedResponse<BackendAuditLog>>('/logs', {
      params: {
        action: filters.action,
        entityType: filters.entityType,
        entityId: filters.entityId,
        from: filters.from,
        to: filters.to,
        page: 1,
        pageSize: 500,
      },
    })
    return data.data
  },
}
