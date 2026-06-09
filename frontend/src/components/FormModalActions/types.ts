export interface FormModalActionsProps {
  onCancel: () => void
  isPending: boolean
  /** Rótulo do botão primário em repouso (ex.: "Salvar", "Salvar alterações"). */
  submitLabel: string
  /** Rótulo durante o loading. Default: "Salvando...". */
  pendingLabel?: string
  /** Modo form: id do `<form>` a ser submetido pelo botão primário. */
  formId?: string
  /** Modo click: handler do primário quando não há `<form>` associado. */
  onSubmit?: () => void
  /** Desabilita o primário além do isPending (ex.: validação local). */
  submitDisabled?: boolean
  /** Exibe a dica "Campos com * são obrigatórios" à esquerda. Default: true. */
  showRequiredHint?: boolean
  /** Dica customizada à esquerda (substitui a de obrigatórios quando presente). */
  hint?: React.ReactNode
}
