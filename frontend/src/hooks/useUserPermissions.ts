import { useAppSelector } from '../store'
import type { Permission } from '../types/employee.types'

export function useUserPermissions() {
  const { role, permissions } = useAppSelector(s => s.auth)
  const isOwner = role === 'Owner'

  const hasPermission = (permission: Permission): boolean =>
    isOwner || permissions.includes(permission)

  return { permissions, hasPermission, isOwner }
}
