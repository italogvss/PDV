export type ExpenseStatus = 'Pago' | 'Pendente'

export type ExpenseCategory =
  | 'Aluguel'
  | 'Fornecedor'
  | 'Energia'
  | 'Salários'
  | 'Marketing'
  | 'Internet'
  | 'Outros'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aluguel',
  'Fornecedor',
  'Energia',
  'Salários',
  'Marketing',
  'Internet',
  'Outros',
]

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  dueDate: string
  status: ExpenseStatus
  amount: number
}
