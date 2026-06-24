import type { Expense } from '../../types'

export interface ExpenseRowMenuProps {
  expense: Expense
  canManage: boolean
  onEdit: (expense: Expense) => void
  onMarkPaid: (id: string) => void
  onDelete: (id: string) => void
  onDeleteSeries?: (id: string, scope: 'future' | 'all') => void
}
