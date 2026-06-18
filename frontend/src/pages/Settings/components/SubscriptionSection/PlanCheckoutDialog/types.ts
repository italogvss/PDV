import type { PixCharge, Plan } from '../../../../../types/subscription.types'

export interface PlanCheckoutDialogProps {
  open: boolean
  plan: Plan | null
  onClose: () => void
  // PIX gerado → o pai abre o PixQrDialog com a cobrança.
  onPixGenerated: (pix: PixCharge) => void
}
