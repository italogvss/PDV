import { useAppSelector } from '../store'
import type { Permission } from '../types/employee.types'
import type { OperationModule } from '../constants/modules'

export function useUserPermissions() {
  const { role, permissions, modules } = useAppSelector(s => s.auth)
  const isOwner = role === 'Owner' || role === 'Admin'

  const hasPermission = (permission: Permission): boolean =>
    isOwner || permissions.includes(permission)

  // O gate de módulo vale para todos (inclusive Owner) — módulos são do tenant, não do papel.
  const isModuleEnabled = (module: OperationModule): boolean => modules.includes(module)

  return { permissions, hasPermission, isOwner, modules, isModuleEnabled }
}
