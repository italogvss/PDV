export interface TenantListItem {
  tenantId: string
  name: string
  role: 'Owner' | 'Employee'
}
