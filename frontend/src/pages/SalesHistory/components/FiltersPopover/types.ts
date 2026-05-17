import type { FilterState } from '../../types'

export interface FiltersPopoverProps {
  anchorEl: HTMLElement | null
  filters: FilterState
  operators: string[]
  onClose: () => void
  onChange: (next: FilterState) => void
  onClear: () => void
}
