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
  isPaid: boolean
  amount: number
  isRecurring: boolean
  paidAt?: string | null
}
