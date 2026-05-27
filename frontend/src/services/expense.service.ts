import { api } from './api'
import type { Expense } from '../pages/Expenses/types'
import type { ExpenseCategory } from '../pages/Expenses/types'

interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface BackendExpense {
  id: string
  description: string
  category: string
  amount: number
  isRecurring: boolean
  dueDate: string
  isPaid: boolean
  paidAt: string | null
  createdAt: string
}

function mapExpense(e: BackendExpense): Expense {
  return {
    id: e.id,
    description: e.description,
    category: e.category as ExpenseCategory,
    amount: e.amount,
    isRecurring: e.isRecurring,
    dueDate: e.dueDate,
    isPaid: e.isPaid,
    paidAt: e.paidAt,
  }
}

export interface CreateExpensePayload {
  description: string
  category: string
  amount: number
  isRecurring: boolean
  dueDate: string
  isPaid: boolean
}

export type UpdateExpensePayload = CreateExpensePayload

export const expenseService = {
  getAll: async (month?: number, year?: number): Promise<Expense[]> => {
    const { data } = await api.get<PaginatedResponse<BackendExpense>>('/expenses', {
      params: { page: 1, pageSize: 200, month, year },
    })
    return data.data.map(mapExpense)
  },

  getRecurring: async (): Promise<Expense[]> => {
    const { data } = await api.get<BackendExpense[]>('/expenses/recurring')
    return data.map(mapExpense)
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    const { data } = await api.post<BackendExpense>('/expenses', payload)
    return mapExpense(data)
  },

  update: async (id: string, payload: UpdateExpensePayload): Promise<Expense> => {
    const { data } = await api.put<BackendExpense>(`/expenses/${id}`, payload)
    return mapExpense(data)
  },

  markAsPaid: async (id: string): Promise<Expense> => {
    const { data } = await api.patch<BackendExpense>(`/expenses/${id}/pay`)
    return mapExpense(data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`)
  },
}
