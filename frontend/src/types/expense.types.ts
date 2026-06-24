export interface CreateExpensePayload {
  description: string
  category: string
  amount: number
  isRecurring: boolean
  dueDate: string
  isPaid: boolean
  repeatCount?: number | null
}

export type UpdateExpensePayload = CreateExpensePayload
