import type { AuditAction, AuditEntityType, StockMovementType } from '../../types/audit.types'

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'

export const ACTION_LABEL: Record<AuditAction, string> = {
  ProductPriceChanged: 'Preço de produto',
  ServicePriceChanged: 'Preço de serviço',
  StockMovement: 'Movimentação de estoque',
  AppointmentStatusChanged: 'Status de agendamento',
  ProductDeactivated: 'Produto desativado',
  ServiceDeactivated: 'Serviço desativado',
  CustomerDeactivated: 'Cliente desativado',
  EmployeeDeactivated: 'Funcionário desativado',
  RolePermissionsChanged: 'Permissões de cargo',
}

export const ACTION_COLOR: Record<AuditAction, ChipColor> = {
  ProductPriceChanged: 'info',
  ServicePriceChanged: 'info',
  StockMovement: 'primary',
  AppointmentStatusChanged: 'secondary',
  ProductDeactivated: 'error',
  ServiceDeactivated: 'error',
  CustomerDeactivated: 'error',
  EmployeeDeactivated: 'error',
  RolePermissionsChanged: 'warning',
}

export const ENTITY_TYPE_LABEL: Record<AuditEntityType, string> = {
  Product: 'Produto',
  Service: 'Serviço',
  Customer: 'Cliente',
  Employee: 'Funcionário',
  Appointment: 'Agendamento',
  TenantRole: 'Cargo',
}

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  Purchase: 'Entrada',
  Sale: 'Saída (Venda)',
  SaleCancel: 'Estorno',
  ManualAdjust: 'Ajuste Manual',
}

// Nomes dos status de agendamento como vêm do enum do backend.
export const STATUS_LABEL: Record<string, string> = {
  Pendente: 'Pendente',
  Confirmado: 'Confirmado',
  EmAtendimento: 'Em atendimento',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

// Opção "Todas" + uma por ação, para o filtro da página.
export const ACTION_FILTER_OPTIONS = ['Todas', ...Object.values(ACTION_LABEL)] as const
