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

export interface Props {
  status: string
  isOverdue: boolean
  // Prefixo curto ("Crediário") para quando o chip aparece fora da tela de crediário —
  // no histórico de vendas "Vencida" sozinho seria lido como estado da venda.
  prefix?: string
}
