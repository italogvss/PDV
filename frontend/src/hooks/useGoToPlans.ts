import { useNavigate } from 'react-router-dom'
import { PLANS_ROUTE } from '../constants/subscription'

// Fonte única de navegação para a tela de planos. Usado por UpsellButton, PremiumBanner,
// UpsellModal e UserMenu para não espalhar a rota de assinatura pela base.
export function useGoToPlans() {
  const navigate = useNavigate()
  return () => navigate(PLANS_ROUTE)
}
