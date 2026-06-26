export type SaleStatus = 'Ativo' | 'Cancelado'

export type SalePaymentMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito'

export const SALE_STATUS_MAP: Record<string, SaleStatus> = {
  Active:    'Ativo',
  Cancelled: 'Cancelado',
}

export interface SaleRecord {
  id: string
  time: string
  customer: string
  operator: string
  payment: SalePaymentMethod
  total: number
  discount: number
  status: SaleStatus
  amountPaid: number
  change: number
  isInstallment: boolean
  installmentCount: number | null
}

export interface FilterState {
  status: SaleStatus | 'Todos'
  payment: SalePaymentMethod | 'Todos'
  operator: string
}
