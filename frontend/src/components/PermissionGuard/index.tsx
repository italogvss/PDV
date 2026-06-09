import { Navigate } from 'react-router-dom'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import type { Permission } from '../../types/employee.types'

interface Props {
  permission: Permission
  children: React.ReactNode
}

export default function PermissionGuard({ permission, children }: Props) {
  const { hasPermission } = useUserPermissions()

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
