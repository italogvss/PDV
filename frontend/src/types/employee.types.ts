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
  userId: string | null
  name: string
  email: string
  roleId: string
  roleName: string
  phone?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
}

export const PERMISSIONS = {
  SellProducts: 'Realizar vendas',
  CancelSales: 'Cancelar vendas',
  ViewSalesHistory: 'Visualizar histórico de vendas',
  ViewStock: 'Visualizar estoque',
  ManageStock: 'Gerenciar estoque',
  ViewExpenses: 'Visualizar despesas',
  ManageExpenses: 'Gerenciar despesas',
  ViewReports: 'Ver relatórios',
  ManageAppointments: 'Gerenciar agendamentos',
  ViewAppointments: 'Visualizar agendamentos',
  ManageEmployees: 'Gerenciar funcionários',
  ViewEmployees: 'Visualizar funcionários',
  ManageCustomers: 'Gerenciar Clientes',
  ViewCustomers: 'Visualizar Clientes',
  ManageSuppliers: 'Gerenciar Fornecedores',
  ViewSuppliers: 'Visualizar Fornecedores',
  ViewLogs: 'Visualizar logs',
} as const satisfies Record<string, string>

export type Permission = keyof typeof PERMISSIONS

export interface CreateEmployeePayload {
  name: string
  username: string
  email: string
  temporaryPassword: string
  roleId: string
  phone?: string
}

export interface UpdateEmployeePayload {
  roleId: string
  phone?: string
}
