import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Subtítulo exibido abaixo do título no ModalHeader. */
  subtitle?: string
  /** Corpo da mensagem de confirmação. */
  description: ReactNode
  /** Rótulo do botão de confirmação (ex: "Excluir", "Desativar"). */
  confirmLabel: string
  /** Rótulo durante o loading. Default: `${confirmLabel}...` */
  pendingLabel?: string
  isPending?: boolean
  onClose: () => void
  onConfirm: () => void
  /** Envolve a descrição em caixa error.soft com ícone de aviso. Indicado para exclusões definitivas. */
  danger?: boolean
}
