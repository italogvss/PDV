export interface CreateSaleItemPayload {
  productId?: string
  serviceId?: string
  quantity: number
}

export interface CreateSalePayload {
  customerId?: string
  customerDocument?: string
  paymentMethod: string
  isInstallment: boolean
  installmentCount?: number
  amountPaid: number
  items: CreateSaleItemPayload[]
}

export interface SaleListItem {
  id: string
  operatorId: string
  operatorName: string
  customerName: string | null
  customerDocument: string | null
  paymentMethod: string
  isInstallment: boolean
  installmentCount: number | null
  installmentValue: number | null
  total: number
  status: string
  cancelledById: string | null
  cancelledAt: string | null
  createdAt: string
}

export interface SaleItemDetail {
  id: string
  saleId: string
  productId: string | null
  serviceId: string | null
  productName: string
  unitPrice: number
  purchasePriceSnapshot: number | null
  quantity: number
  subtotal: number
}

export interface SaleDetail extends SaleListItem {
  items: SaleItemDetail[]
  amountPaid: number
  change: number
}
