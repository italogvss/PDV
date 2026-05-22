export interface AuthUser {
  userId: string
  tenantId: string | null
  name: string
  role: 'Owner' | 'Employee'
}
