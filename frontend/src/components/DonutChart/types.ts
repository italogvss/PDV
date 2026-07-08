import type { ReactNode } from 'react'

export interface DonutChartSegment {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  title: string
  subtitle?: string
  /** Texto explicativo do gráfico, exibido num ícone de ajuda ao lado do título. */
  info?: string
  action?: ReactNode
  segments: DonutChartSegment[]
  loading?: boolean
  emptyText?: string
  /** Diâmetro do donut em px. @default 200 */
  size?: number
  /** Mostra o total somado no centro do donut. */
  showTotal?: boolean
  /** @default 'Total' */
  totalLabel?: string
  /** Formata os valores exibidos (centro, linhas e tooltip). @default formatBRL */
  valueFormatter?: (value: number) => string
}
