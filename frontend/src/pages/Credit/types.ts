// Estado exibido de uma conta/parcela. "Vencida" não existe no backend como status —
// é derivado (isOverdue) e tem precedência visual sobre "Em aberto".
export type CreditDisplayStatus = 'Em aberto' | 'Vencida' | 'Quitada' | 'Cancelada'

export const CREDIT_STATUS_COLORS: Record<CreditDisplayStatus, 'success' | 'warning' | 'error' | 'default'> = {
  'Em aberto': 'warning',
  Vencida: 'error',
  Quitada: 'success',
  Cancelada: 'default',
}

export function resolveDisplayStatus(status: string, isOverdue: boolean): CreditDisplayStatus {
  if (status === 'Cancelled') return 'Cancelada'
  if (status === 'Paid') return 'Quitada'
  return isOverdue ? 'Vencida' : 'Em aberto'
}

// Abas da página: consolidado por venda × agenda de recebimentos.
export type CreditView = 'accounts' | 'installments'

export const STATUS_FILTER_OPTIONS = ['Todas', 'Em aberto', 'Vencidas', 'Quitadas'] as const
export type StatusFilterOption = (typeof STATUS_FILTER_OPTIONS)[number]

export const CREDIT_SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'dueDate', label: 'Vencimento mais próximo' },
  { value: 'balanceDesc', label: 'Maior saldo' },
  { value: 'customer', label: 'Cliente (A-Z)' },
]

// Datas de vencimento são data pura no backend — formatar em UTC evita o "voltou um dia"
// causado pelo fuso local (mesmo tratamento de Expenses.fmtDueDate).
export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
