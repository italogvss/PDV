import type { Plan } from '../../../../../types/subscription.types'

export interface PlansDialogProps {
  open: boolean
  plans: Plan[]
  onClose: () => void
  onSelectPlan: (plan: Plan) => void
}
