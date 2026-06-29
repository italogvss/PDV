import type { ReactNode } from 'react'

export interface SortOption {
  value: string
  label: string
}

export interface Props {
  title: string
  description?: string
  children?: ReactNode
  showHelp?: boolean
  helpUrl?: string
  sortOptions?: SortOption[]
  sortValue?: string
  onSortChange?: (value: string) => void
}
