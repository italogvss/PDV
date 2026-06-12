export interface ChipSelectOption {
  id: string
  label: string
  color?: string
}

export interface ChipSelectProps {
  options: ChipSelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  loading?: boolean
  error?: string
  emptyMessage?: string
  size?: 'small' | 'medium' | 'large'
  /** Permite desmarcar clicando no chip já selecionado. Padrão: false */
  nullable?: boolean
  /** 'dot' = bolinha colorida dentro do chip; 'fill' = chip selecionado assume a cor do item */
  colorMode?: 'dot' | 'fill'
}
