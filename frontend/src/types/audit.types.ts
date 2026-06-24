// Tipos do log de auditoria centralizado (entidade AuditLog no backend).
// O payload de detalhes varia conforme a ação — modelado como união discriminada por `action`.

export type AuditAction =
  | 'ProductPriceChanged'
  | 'ServicePriceChanged'
  | 'StockMovement'
  | 'AppointmentStatusChanged'
  | 'ProductDeactivated'
  | 'ServiceDeactivated'
  | 'CustomerDeactivated'
  | 'EmployeeDeactivated'
  | 'RolePermissionsChanged'

export type AuditEntityType =
  | 'Product'
  | 'Service'
  | 'Customer'
  | 'Employee'
  | 'Appointment'
  | 'TenantRole'

export type StockMovementType = 'Purchase' | 'Sale' | 'SaleCancel' | 'ManualAdjust'

// ---- Payloads de detalhe por ação ----

export interface PriceChangeDetails {
  oldPrice: number
  newPrice: number
}

export interface StockMovementDetails {
  type: StockMovementType
  quantity: number
  unitCost?: number | null
  supplierId?: string | null
  supplierName?: string | null
  note?: string | null
}

export interface AppointmentStatusDetails {
  fromStatus: string
  toStatus: string
}

export interface RolePermissionsDetails {
  before: string[]
  after: string[]
}

export type AuditDetails =
  | PriceChangeDetails
  | StockMovementDetails
  | AppointmentStatusDetails
  | RolePermissionsDetails
  | null

// Linha já normalizada para consumo na UI.
export interface AuditLogRow {
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string | null
  entityName: string
  performedByUserId: string | null
  performedByName: string
  details: AuditDetails
  createdAt: string
}

export interface AuditLogFilters {
  action?: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  from?: string
  to?: string
}
