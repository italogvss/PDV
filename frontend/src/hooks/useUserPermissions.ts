import { useAppSelector } from '../store'
import type { Permission } from '../types/employee.types'
import type { OperationModule } from '../constants/modules'

const ACTIVE_STATUSES = ['Active', 'Trialing', 'Canceled'] as const

export function useUserPermissions() {
  const { role, permissions, modules, subscription } = useAppSelector(s => s.auth)
  const isOwner = role === 'Owner' || role === 'Admin'

  const hasPermission = (permission: Permission): boolean =>
    isOwner || permissions.includes(permission)

  // O gate de módulo vale para todos (inclusive Owner) — módulos são do tenant, não do papel.
  const isModuleEnabled = (module: OperationModule): boolean => modules.includes(module)

  // Bloqueia requisições apenas quando a assinatura foi carregada E está em estado inválido.
  // Enquanto null (ainda carregando), deixa passar — o backend retorna 402 se necessário.
  // 'Canceled' é incluído pois o backend ainda serve dados até currentPeriodEnd.
  const hasActiveSubscription =
    subscription === null || (ACTIVE_STATUSES as readonly string[]).includes(subscription.status)

  return { permissions, hasPermission, isOwner, modules, isModuleEnabled, hasActiveSubscription }
}
