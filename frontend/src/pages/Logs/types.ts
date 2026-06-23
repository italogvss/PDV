export type LogTab = 'appointment-status' | 'stock-movement' | 'price-history'

export interface AppointmentStatusLogRow {
  id: string
  appointmentId: string | null
  fromStatus: string
  toStatus: string
  changedByUserId: string | null
  changedByName: string
  changedAt: string
}

export interface StockMovementRow {
  id: string
  productId: string | null
  productName: string
  type: string
  typeLabel: string
  quantity: number
  displayQty: number
  unitCost: number | null
  supplierId: string | null
  supplierName: string | null
  note: string | null
  createdByUserId: string | null
  createdByName: string
  createdAt: string
}

export interface PriceHistoryRow {
  id: string
  entityType: string
  entityTypeLabel: string
  entityId: string | null
  entityName: string
  oldPrice: number
  newPrice: number
  delta: number
  changedByUserId: string | null
  changedByName: string
  changedAt: string
}
