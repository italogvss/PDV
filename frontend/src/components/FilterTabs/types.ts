/** Uma aba de filtro: identificador, rótulo visível e cor opcional. */
export interface FilterTabOption {
  /** Valor único da aba, emitido em `onChange` e comparado com `value`. */
  value: string
  /** Texto exibido na aba. */
  label: string
  /**
   * Token de cor do tema (ex.: `'info.main'`) usado como fundo da pílula
   * quando a aba está selecionada. Sem cor, a aba usa fundo neutro.
   */
  color?: string
}

export interface Props {
  /** Valor da aba atualmente selecionada. */
  value: string
  /** Chamado com o `value` da aba clicada. */
  onChange: (value: string) => void
  options: FilterTabOption[]
}
