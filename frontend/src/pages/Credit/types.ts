// O status exibido ("Vencida" e cia.) vive em components/CreditStatusChip/types — o chip
// agora é primitivo, porque o histórico de vendas também mostra a situação do crediário.

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
