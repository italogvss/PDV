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

export type ExpenseCategoryChip = {
  label: string
  color: string
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, ExpenseCategoryChip> = {
  Aluguel: { label: 'Aluguel', color: '#be4444' },
  Fornecedor: { label: 'Fornecedor', color: '#c78f45' },
  Energia: { label: 'Energia', color: '#d4bd37' },
  Agua: { label: 'Água', color: '#1d88b9' },
  Internet: { label: 'Internet', color: '#243974' },
  Salarios: { label: 'Salários', color: '#328539' },
  Marketing: { label: 'Marketing', color: '#c244b1' },
  Impostos: { label: 'Impostos', color: '#be4444' },
  Manutencao: { label: 'Manutenção', color: '#42a881' },
  Outros: { label: 'Outros', color: '#595e66' },
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
  repeatCount?: number | null
  recurringSeriesId?: string | null
}
