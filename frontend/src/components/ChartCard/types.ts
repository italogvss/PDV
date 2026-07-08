import type { ReactNode } from 'react'

export interface ChartCardProps {
  title: string
  subtitle?: string
  /** Texto explicativo do gráfico, exibido num ícone de ajuda ao lado do título. */
  info?: string
  action?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  height?: number
  children: ReactNode
}
