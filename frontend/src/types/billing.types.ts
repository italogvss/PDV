export type UserPaymentKind = 'CardSubscription' | 'OneOffCheckout'
export type UserPaymentMethod = 'Card'
export type UserPaymentStatus =
  | 'Pending'
  | 'Paid'
  | 'Failed' // cobrança de renovação recusada; o gateway ainda vai retentar
  | 'Refunded'
  | 'Disputed'
  | 'Expired'
  | 'Cancelled'

export interface UserPayment {
  id: string
  kind: UserPaymentKind
  method: UserPaymentMethod
  amountCents: number
  status: UserPaymentStatus
  paidAt: string | null
  receiptUrl: string | null
  cardLastFour: string | null
  cardBrand: string | null
  periodStart: string | null
  periodEnd: string | null
  // Número da tentativa recusada — só em status 'Failed'.
  retryNumber: number | null
  createdAt: string
}

export interface UserPaymentPage {
  data: UserPayment[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
