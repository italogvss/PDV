export type UserPaymentKind = 'CardSubscription' | 'PixSubscription' | 'OneOffCheckout'
export type UserPaymentMethod = 'Card' | 'Pix'
export type UserPaymentStatus = 'Pending' | 'Paid' | 'Refunded' | 'Disputed' | 'Expired' | 'Cancelled'

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
  createdAt: string
}

export interface UserPaymentPage {
  data: UserPayment[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
