import type { Permission } from '../types/employee.types'

// Registro central dos módulos da operação — fonte única reutilizada pelo menu lateral
// (NAV_SECTIONS), pela tela de Operação (switches) e pela matriz de permissões (Funcionários).
// As keys batem (lowercase) com o enum OperationModule do backend.
export type OperationModule =
  | 'sales'
  | 'inventory'
  | 'services'
  | 'appointments'
  | 'expenses'
  | 'reports'
  | 'customers'
  | 'suppliers'
  | 'logs'

interface ModuleDefinition {
  label: string
  description: string
  permissions: Permission[]
}

export const OPERATION_MODULES: Record<OperationModule, ModuleDefinition> = {
  sales: {
    label: 'Vendas / PDV',
    description: 'Frente de caixa, vendas e histórico.',
    permissions: ['SellProducts', 'CancelSales', 'ViewSalesHistory'],
  },
  inventory: {
    label: 'Estoque',
    description: 'Cadastro e controle de produtos.',
    permissions: ['ViewStock', 'ManageStock'],
  },
  services: {
    label: 'Serviços',
    description: 'Catálogo de serviços oferecidos.',
    permissions: [],
  },
  appointments: {
    label: 'Agendamentos',
    description: 'Agenda e marcação de horários.',
    permissions: ['ManageAppointments', 'ViewAppointments'],
  },
  expenses: {
    label: 'Despesas',
    description: 'Contas e despesas do negócio.',
    permissions: ['ViewExpenses', 'ManageExpenses'],
  },
  reports: {
    label: 'Relatórios',
    description: 'Lucros, indicadores e relatórios.',
    permissions: ['ViewReports'],
  },
  customers: {
    label: 'Clientes',
    description: 'Cadastro e relacionamento com clientes.',
    permissions: ['ManageCustomers', 'ViewCustomers'],
  },
  suppliers: {
    label: 'Fornecedores',
    description: 'Cadastro de fornecedores.',
    permissions: ['ManageSuppliers', 'ViewSuppliers'],
  },
  logs: {
    label: 'Logs',
    description: 'Histórico de movimentações, status e preços.',
    permissions: ['ViewLogs'],
  },
}

export const ALL_MODULES = Object.keys(OPERATION_MODULES) as OperationModule[]

// Mapa reverso permissão → módulo. Permissões fora do mapa (ex.: ManageEmployees) são
// "core" e ficam sempre visíveis, independente dos módulos ativos.
export const permissionToModule: Partial<Record<Permission, OperationModule>> = Object.fromEntries(
  ALL_MODULES.flatMap((m) => OPERATION_MODULES[m].permissions.map((p) => [p, m])),
) as Partial<Record<Permission, OperationModule>>
