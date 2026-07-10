import type { Plan } from '../../../../../types/subscription.types'

// `checkout` leva ao pagamento (contratação/reativação). `change` troca o plano de uma assinatura
// viva: não passa pelo gateway de pagamento, então o texto e o CTA precisam ser outros.
export type PlansDialogMode = 'checkout' | 'change'

export interface PlansDialogProps {
  open: boolean
  plans: Plan[]
  onClose: () => void
  onSelectPlan: (plan: Plan) => void
  mode?: PlansDialogMode
  // Só em `change`: destaca a variante já contratada e desabilita o CTA dela.
  currentPlanId?: string | null
}
