import { api } from './api'
import type { Expense } from '../pages/Expenses/types'
import type { ExpenseCategory } from '../pages/Expenses/types'
import type { CreateExpensePayload, UpdateExpensePayload } from '../types/expense.types'

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
  repeatCount?: number | null
  recurringSeriesId?: string | null
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
    repeatCount: e.repeatCount,
    recurringSeriesId: e.recurringSeriesId,
  }
}

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

  deleteWithScope: async (id: string, scope: 'future' | 'all'): Promise<void> => {
    await api.delete(`/expenses/${id}`, { params: { scope } })
  },
}
