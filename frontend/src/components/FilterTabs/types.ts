export interface FilterTabOption {
  value: string
  label: string
  /** Cor de fundo da aba quando selecionada. Sem cor, usa fundo neutro. */
  color?: string
}

export interface Props {
  value: string
  onChange: (value: string) => void
  options: FilterTabOption[]
}
