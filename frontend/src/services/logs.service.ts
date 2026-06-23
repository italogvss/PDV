import { api } from './api'
import type {
  AppointmentStatusLogRow,
  StockMovementRow,
  PriceHistoryRow,
} from '../pages/Logs/types'

interface PagedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendAppointmentStatusLog {
  id: string
  appointmentId: string | null
  fromStatus: string
  toStatus: string
  changedByUserId: string | null
  changedByName: string
  changedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  Pendente: 'Pendente',
  Confirmado: 'Confirmado',
  EmAtendimento: 'Em atendimento',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

function mapStatusLog(l: BackendAppointmentStatusLog): AppointmentStatusLogRow {
  return {
    id: l.id,
    appointmentId: l.appointmentId,
    fromStatus: STATUS_LABEL[l.fromStatus] ?? l.fromStatus,
    toStatus: STATUS_LABEL[l.toStatus] ?? l.toStatus,
    changedByUserId: l.changedByUserId,
    changedByName: l.changedByName,
    changedAt: l.changedAt,
  }
}

interface BackendStockMovement {
  id: string
  productId: string | null
  productName: string
  type: string
  quantity: number
  unitCost: number | null
  supplierId: string | null
  supplierName: string | null
  note: string | null
  createdByUserId: string | null
  createdByName: string
  createdAt: string
}

export const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  Purchase: 'Entrada',
  Sale: 'Saída (Venda)',
  SaleCancel: 'Estorno',
  ManualAdjust: 'Ajuste Manual',
}

function signedQty(type: string, qty: number): number {
  if (type === 'Sale') return -qty
  return qty // Purchase, SaleCancel positivos; ManualAdjust já vem assinado
}

function mapStockMovement(m: BackendStockMovement): StockMovementRow {
  return {
    id: m.id,
    productId: m.productId,
    productName: m.productName,
    type: m.type,
    typeLabel: MOVEMENT_TYPE_LABEL[m.type] ?? m.type,
    quantity: m.quantity,
    displayQty: signedQty(m.type, m.quantity),
    unitCost: m.unitCost,
    supplierId: m.supplierId,
    supplierName: m.supplierName,
    note: m.note,
    createdByUserId: m.createdByUserId,
    createdByName: m.createdByName,
    createdAt: m.createdAt,
  }
}

interface BackendPriceHistory {
  id: string
  entityType: string
  entityId: string | null
  entityName: string
  oldPrice: number
  newPrice: number
  changedByUserId: string | null
  changedByName: string
  changedAt: string
}

function mapPriceHistory(h: BackendPriceHistory): PriceHistoryRow {
  return {
    id: h.id,
    entityType: h.entityType,
    entityTypeLabel: h.entityType === 'Product' ? 'Produto' : 'Serviço',
    entityId: h.entityId,
    entityName: h.entityName,
    oldPrice: h.oldPrice,
    newPrice: h.newPrice,
    delta: h.newPrice - h.oldPrice,
    changedByUserId: h.changedByUserId,
    changedByName: h.changedByName,
    changedAt: h.changedAt,
  }
}

export const logsService = {
  getAppointmentStatusLogs: async (from: string, to: string): Promise<AppointmentStatusLogRow[]> => {
    const { data } = await api.get<PagedResponse<BackendAppointmentStatusLog>>(
      '/logs/appointment-status',
      { params: { from, to, page: 1, pageSize: 500 } },
    )
    return data.data.map(mapStatusLog)
  },

  getStockMovements: async (from: string, to: string): Promise<StockMovementRow[]> => {
    const { data } = await api.get<PagedResponse<BackendStockMovement>>(
      '/logs/stock-movements',
      { params: { from, to, page: 1, pageSize: 500 } },
    )
    return data.data.map(mapStockMovement)
  },

  getPriceHistory: async (from: string, to: string): Promise<PriceHistoryRow[]> => {
    const { data } = await api.get<PagedResponse<BackendPriceHistory>>(
      '/logs/price-history',
      { params: { from, to, page: 1, pageSize: 500 } },
    )
    return data.data.map(mapPriceHistory)
  },
}
