import type { PixCharge } from '../../../../../types/subscription.types'

export interface PixQrDialogProps {
  open: boolean
  pix: PixCharge | null
  onClose: () => void
}
