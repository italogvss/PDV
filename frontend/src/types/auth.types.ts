import type { UserSettingsDTO } from './usersettings.type'
import type { TenantListItem } from './tenant.types'

export type UserRole = 'Owner' | 'Employee'

export interface AuthUser {
  userId: string
  tenantId: string | null
  name: string
  email: string
  avatarUrl: string | null
  role: UserRole
  settings: UserSettingsDTO | null
  tenants: TenantListItem[]
}
