import type { Plan } from '../../types/subscription.types'

export interface PlansGridProps {
  plans: Plan[]
  onSelectPlan: (plan: Plan) => void
  // Desabilita os CTAs (ex.: checkout de outro plano já em andamento).
  disabled?: boolean
  // Variante já contratada — o card correspondente vira "Plano atual" e perde o CTA.
  currentPlanId?: string | null
  // Rótulo do CTA. Default "Assinar agora"; a troca de plano usa "Mudar para este plano".
  ctaLabel?: string
}
