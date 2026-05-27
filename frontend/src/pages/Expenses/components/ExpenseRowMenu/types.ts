import type { Expense } from '../../types'

export interface ExpenseRowMenuProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onMarkPaid: (id: string) => void
  onDelete: (id: string) => void
}
