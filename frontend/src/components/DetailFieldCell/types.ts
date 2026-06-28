import type { ReactNode } from 'react'

export interface DetailFieldCellProps {
  label: string
  children: ReactNode
  /** Adiciona borda à direita (para células em grid de 2 colunas). */
  borderRight?: boolean
}

export interface DetailFieldValueProps {
  value: string | null | undefined
  icon?: ReactNode
}
