export type ExpenseStatus = 'Pago' | 'Pendente'

export type ExpenseCategory =
  | 'Aluguel'
  | 'Fornecedor'
  | 'Energia'
  | 'Agua'
  | 'Internet'
  | 'Salários'
  | 'Marketing'
  | 'Impostos'
  | 'Manutenção'
  | 'Outros'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aluguel',
  'Fornecedor',
  'Energia',
  'Agua',
  'Internet',
  'Salários',
  'Marketing',
  'Impostos',
  'Manutenção',
  'Outros',
]

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  dueDate: string
  status: ExpenseStatus
  amount: number
  recurring: boolean
  renewalDate?: string
}
