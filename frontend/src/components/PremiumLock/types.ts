import type { ReactNode } from 'react'
import type { PlanFeature } from '../../constants/entitlements'

export interface Props {
  // Feature necessária. Se o plano não a concede, o conteúdo é bloqueado com overlay premium.
  feature: PlanFeature
  children: ReactNode
  // Conteúdo da UpsellModal aberta ao clicar no bloqueio (defaults genéricos na modal).
  title?: string
  description?: string
  // Raio da borda do overlay, para casar com o elemento envolvido.
  radius?: number | string
}
