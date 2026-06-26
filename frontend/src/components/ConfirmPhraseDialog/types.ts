import type { ReactNode } from 'react'

export interface ConfirmPhraseDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  warningText: ReactNode
  confirmPhrase: string
  confirmButtonLabel: string
  confirmButtonIcon: ReactNode
  isPending: boolean
  onConfirm: () => void
}
