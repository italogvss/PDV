export interface CreateTenantResponse {
  tenantId: string
  fantasyName: string
}

export interface TenantListItem {
  tenantId: string
  name: string
  role: 'Owner' | 'Employee'
  logoUrl: string | null
}
