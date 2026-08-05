// Espelho das chaves do backend (CreditAccountStatus / CreditInstallmentStatus).
// "Vencida" não é status: vem derivada em `isOverdue`.
export type CreditAccountStatus = 'Open' | 'Paid' | 'Cancelled'
export type CreditInstallmentStatus = 'Open' | 'Paid' | 'Cancelled'

export interface CreditAccount {
  id: string
  saleId: string
  customerId: string
  customerName: string
  totalAmount: number
  downPayment: number
  paidAmount: number
  balance: number
  installmentCount: number
  paidInstallmentCount: number
  firstDueDate: string
  nextDueDate: string | null
  isOverdue: boolean
  overdueInstallmentCount: number
  overdueAmount: number
  status: CreditAccountStatus
  settledAt: string | null
  note: string | null
  createdAt: string
}

export interface CreditInstallment {
  id: string
  creditAccountId: string
  customerId: string
  customerName: string
  number: number
  ofTotal: number
  dueDate: string
  amount: number
  paidAmount: number
  balance: number
  paidAt: string | null
  status: CreditInstallmentStatus
  isOverdue: boolean
  daysOverdue: number
}

export interface CreditPayment {
  id: string
  creditAccountId: string
  creditInstallmentId: string
  installmentNumber: number
  amount: number
  method: string
  receivedAt: string
  operatorName: string
  note: string | null
}

// Ponteiro para a venda de origem. Itens, desconto e taxa são do histórico de vendas —
// aqui só o suficiente para identificar a venda e linkar para lá.
export interface CreditSaleRef {
  saleId: string
  saleDate: string
  paymentMethod: string
  total: number
  status: string
  itemCount: number
}

export interface CreditAccountDetail {
  account: CreditAccount
  sale: CreditSaleRef | null
  installments: CreditInstallment[]
  payments: CreditPayment[]
}

export interface CreditSummary {
  totalReceivable: number
  overdueAmount: number
  receivedThisMonth: number
  customersWithBalance: number
  openAccounts: number
  overdueInstallments: number
}

export interface CreditAgingBucket {
  label: string
  amount: number
  installmentCount: number
}

export interface CreditTopDebtor {
  customerId: string
  customerName: string
  balance: number
  overdueAmount: number
  openAccounts: number
}

export interface CreditAging {
  buckets: CreditAgingBucket[]
  topDebtors: CreditTopDebtor[]
  totalReceivable: number
  overdueAmount: number
  defaultRate: number
}

export interface CreditReminder {
  installmentId: string
  customerName: string
  customerPhone: string | null
  amount: number
  dueDate: string
  daysOverdue: number
  message: string
}

export interface CreditFilters {
  customerId?: string
  status?: CreditAccountStatus
  overdue?: boolean
  dueFrom?: string
  dueTo?: string
  search?: string
}

export interface CreateCreditAccountPayload {
  saleId: string
  installmentCount: number
  firstDueDate: string
  downPayment: number
  note?: string
}

export interface ReceiveInstallmentPayload {
  amount: number
  method: string
  receivedAt: string
  note?: string
}
