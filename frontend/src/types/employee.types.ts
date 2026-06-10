export interface TenantRole {
  id: string
  name: string
  description?: string
  color?: string
  isDefault: boolean
  memberCount: number
  permissions: string[]
}

export interface Employee {
  id: string
  userId: string
  name: string
  email: string
  roleId: string
  roleName: string
  salary?: number
  phone?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
}

export type Permission =
  | 'SellProducts'
  | 'CancelSales'
  | 'ViewStock'
  | 'ManageStock'
  | 'ViewExpenses'
  | 'ManageExpenses'
  | 'ViewReports'
  | 'ManageEmployees'

export const PERMISSION_LABELS: Record<Permission, string> = {
  SellProducts: 'Realizar vendas',
  CancelSales: 'Cancelar vendas',
  ViewStock: 'Visualizar estoque',
  ManageStock: 'Gerenciar estoque',
  ViewExpenses: 'Visualizar despesas',
  ManageExpenses: 'Gerenciar despesas',
  ViewReports: 'Ver relatórios',
  ManageEmployees: 'Gerenciar funcionários',
}

export const ALL_PERMISSIONS: Permission[] = [
  'SellProducts',
  'CancelSales',
  'ViewStock',
  'ManageStock',
  'ViewExpenses',
  'ManageExpenses',
  'ViewReports',
  'ManageEmployees',
]

export interface CreateEmployeePayload {
  name: string
  email: string
  temporaryPassword: string
  roleId: string
  salary?: number
  phone?: string
}

export interface UpdateEmployeePayload {
  roleId: string
  salary?: number
  phone?: string
}
