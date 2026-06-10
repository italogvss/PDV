import type { TenantRole } from '../../../../types/employee.types'

export interface RoleFormModalProps {
  open: boolean
  editRole?: TenantRole | null
  onClose: () => void
}
