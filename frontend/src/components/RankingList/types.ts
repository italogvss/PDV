import type { ReactNode } from 'react'

export interface RankingListItem {
  id: string
  label: string
  value: number
  primaryText: string
  secondaryText?: string
}

export interface RankingListProps {
  title: string
  subtitle?: string
  /** Texto explicativo exibido num ícone de ajuda ao lado do título. */
  info?: string
  action?: ReactNode
  items: RankingListItem[]
  loading?: boolean
  emptyText?: string
  /** Máximo de itens exibidos. @default 10 */
  maxItems?: number
}
