export interface FilterSection {
  id: string
  label: string
  options: string[]
  value: string
  onChange: (next: string) => void
}

export interface FiltersPopoverProps {
  anchorEl: HTMLElement | null
  sections: FilterSection[]
  onClose: () => void
  onClear: () => void
}
