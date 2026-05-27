import type { Expense } from '../../types'

export interface NewExpenseModalProps {
  open: boolean
  onClose: () => void
  expense?: Expense
}
