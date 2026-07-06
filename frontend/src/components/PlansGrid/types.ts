import type { Plan } from '../../types/subscription.types'

export interface PlansGridProps {
  plans: Plan[]
  onSelectPlan: (plan: Plan) => void
  // Desabilita os CTAs (ex.: checkout de outro plano já em andamento).
  disabled?: boolean
}
