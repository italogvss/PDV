import type { CreditAccount } from '../../types/credit.types'

export type SaleStatus = 'Ativo' | 'Cancelado'

export type SalePaymentMethod = 'Pix' | 'Dinheiro' | 'Crédito' | 'Débito'

// Como a venda foi paga: à vista (qualquer forma) ou fiado (tem crediário aberto).
export type SaleKind = 'À vista' | 'Crediário'

export const SALE_STATUS_MAP: Record<string, SaleStatus> = {
  Active:    'Ativo',
  Cancelled: 'Cancelado',
}

export interface SaleRecord {
  id: string
  time: string
  rawTime: string
  customer: string
  operator: string
  payment: SalePaymentMethod
  total: number
  discount: number
  status: SaleStatus
  isInstallment: boolean
  installmentCount: number | null
  credit: CreditAccount | null
}

export interface FilterState {
  status: SaleStatus | 'Todos'
  payment: SalePaymentMethod | 'Todos'
  operator: string
  kind: SaleKind | 'Todos'
}
