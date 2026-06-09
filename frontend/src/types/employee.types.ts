export type EmployeeType = 'Manager' | 'Employee'

export type Permission =
  | 'SellProducts'
  | 'CancelSales'
  | 'ViewStock'
  | 'ManageStock'
  | 'ViewExpenses'
  | 'ManageExpenses'
  | 'ViewReports'
  | 'ManageEmployees'

export interface Employee {
  id: string
  userId: string
  name: string
  email: string
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
  avatarPath?: string
  isActive: boolean
  createdAt: string
}

export interface EmployeePermissions {
  employeeType: EmployeeType
  permissions: Permission[]
}

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  Manager: 'Gerente',
  Employee: 'Funcionário',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  SellProducts: 'Registrar vendas',
  CancelSales: 'Cancelar vendas',
  ViewStock: 'Ver estoque',
  ManageStock: 'Ajustar estoque',
  ViewExpenses: 'Ver despesas',
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
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}

export interface UpdateEmployeePayload {
  employeeType: EmployeeType
  position: string
  salary?: number
  phone?: string
}
