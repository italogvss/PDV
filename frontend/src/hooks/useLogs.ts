import { useQuery } from '@tanstack/react-query'
import { logsService } from '../services/logs.service'
import { useUserPermissions } from './useUserPermissions'
import type { AuditLogFilters } from '../types/audit.types'

const QUERY_KEY = 'audit-logs'

// Hook de consulta reutilizável do log de auditoria. Aceita filtros (ação, entidade, datas)
// e só dispara quando o usuário tem assinatura ativa, o módulo Logs habilitado e ViewLogs.
export function useAuditLogs(filters: AuditLogFilters, enabled = true) {
  const { hasPermission, isModuleEnabled, hasActiveSubscription } = useUserPermissions()
  return useQuery({
    queryKey: [QUERY_KEY, filters] as const,
    queryFn: () => logsService.getAuditLogs(filters),
    enabled:
      hasActiveSubscription && enabled && isModuleEnabled('logs') && hasPermission('ViewLogs'),
  })
}
