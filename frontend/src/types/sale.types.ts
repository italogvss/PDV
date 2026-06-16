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
  discount: number
  items: CreateSaleItemPayload[]
}

export interface SaleListItem {
  id: string
  operatorId: string | null
  operatorName: string
  customerName: string | null
  customerDocument: string | null
  paymentMethod: string
  isInstallment: boolean
  installmentCount: number | null
  installmentValue: number | null
  total: number
  discount: number
  status: string
  cancelledById: string | null
  cancelledByName: string | null
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
