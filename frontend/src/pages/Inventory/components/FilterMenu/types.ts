export interface FilterMenuProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}
