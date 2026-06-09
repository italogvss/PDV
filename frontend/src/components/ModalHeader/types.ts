export interface ModalHeaderProps {
  title: string
  subtitle?: string
  onClose: () => void
  /** Desabilita o botão de fechar enquanto uma ação está em andamento. */
  disabled?: boolean
}
