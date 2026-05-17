export type SaleStatus = 'Pago' | 'Pendente' | 'Cancelado'

export type SalePaymentMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito'

export interface SaleRecord {
  id: string
  time: string
  customer: string
  operator: string
  items: number
  payment: SalePaymentMethod
  total: number
  status: SaleStatus
}

export interface FilterState {
  status: SaleStatus | 'Todos'
  payment: SalePaymentMethod | 'Todos'
  operator: string
}
