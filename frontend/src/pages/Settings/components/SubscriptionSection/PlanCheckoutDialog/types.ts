import type { Plan } from '../../../../../types/subscription.types'

export interface PlanCheckoutDialogProps {
  open: boolean
  plan: Plan | null
  onClose: () => void
}
