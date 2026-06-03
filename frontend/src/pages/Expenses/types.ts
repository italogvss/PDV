export type ExpenseCategory =
  | 'Aluguel'
  | 'Fornecedor'
  | 'Energia'
  | 'Agua'
  | 'Internet'
  | 'Salarios'
  | 'Marketing'
  | 'Impostos'
  | 'Manutencao'
  | 'Outros'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aluguel',
  'Fornecedor',
  'Energia',
  'Agua',
  'Internet',
  'Salarios',
  'Marketing',
  'Impostos',
  'Manutencao',
  'Outros',
]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Aluguel: 'Aluguel',
  Fornecedor: 'Fornecedor',
  Energia: 'Energia',
  Agua: 'Água',
  Internet: 'Internet',
  Salarios: 'Salários',
  Marketing: 'Marketing',
  Impostos: 'Impostos',
  Manutencao: 'Manutenção',
  Outros: 'Outros',
}

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
