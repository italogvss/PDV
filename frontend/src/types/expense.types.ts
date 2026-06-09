export interface CreateExpensePayload {
  description: string
  category: string
  amount: number
  isRecurring: boolean
  dueDate: string
  isPaid: boolean
}

export type UpdateExpensePayload = CreateExpensePayload
