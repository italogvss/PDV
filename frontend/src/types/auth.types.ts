import type { UserSettingsDTO } from './usersettings.type'
import type { TenantListItem } from './tenant.types'
import type { Permission } from './employee.types'
import type { OperationModule } from '../constants/modules'

export type UserRole = 'Owner' | 'Employee'

export interface AuthUser {
  userId: string
  tenantId: string | null
  name: string
  email: string
  phone: string | null
  document: string | null
  birthDate: string | null
  avatarUrl: string | null
  role: UserRole
  settings: UserSettingsDTO | null
  tenants: TenantListItem[]
  mustChangePassword: boolean
  permissions: Permission[]
  modules: OperationModule[]
}
