import { Box, CircularProgress, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import PlansGrid from '../../components/PlansGrid'
import { usePlans, useSubscription, useStartCheckout } from '../../hooks/useSubscription'
import { setStoredPlanSlug } from '../../utils/planSelection'
import type { Plan } from '../../types/subscription.types'

// Tela cheia pós-login quando não veio slug da landing (`resolvePostLoginPath`). Quem nunca usou
// trial escolhe o plano e segue pro onboarding (trial de 30 dias inicia lá); quem já usou vai
// direto pro checkout — sem passar pelo onboarding antes de pagar.
export default function ChoosePlanPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data: plans, isLoading: loadingPlans } = usePlans()
  const { data: subscription, isLoading: loadingSubscription } = useSubscription()
  const startCheckout = useStartCheckout()

  const logoSrc = theme.palette.mode === 'dark' ? '/logo-white.png' : '/logo-black.png'
  const hasUsedTrial = subscription?.hasUsedTrial ?? false
  const loading = loadingPlans || loadingSubscription

  const handleSelectPlan = (plan: Plan) => {
    if (hasUsedTrial) {
      // Cancelar/abandonar o pagamento volta pra cá (não pra Configurações — ainda não há tenant).
      startCheckout.mutate({ planId: plan.id, returnUrl: `${window.location.origin}/planos` })
      return
    }
    setStoredPlanSlug(plan.slug)
    navigate('/criar-negocio')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'surface.default',
        px: 2,
        py: { xs: 6, md: 8 },
        // Mesmo espírito do Login (gradiente radial sutil), com um tom premium dourado a mais —
        // esta é a tela que decide o plano, então ecoa a cor do upsell/banner Profissional.
        backgroundImage: (t) =>
          `radial-gradient(60% 50% at 12% 0%, ${alpha(t.palette.accent[300], 0.24)} 0%, transparent 60%),` +
          `radial-gradient(55% 45% at 100% 0%, ${alpha(t.palette.premium[300], 0.3)} 0%, transparent 55%)`,
      }}
    >
      <Box component="img" src={logoSrc} alt="Ka$hing" sx={{ height: 48, mb: 5 }} />

      <Box sx={{ textAlign: 'center', maxWidth: 640, mb: 6 }}>
        <Typography variant="overline" sx={{ color: 'premium.700', fontWeight: 700, letterSpacing: '0.08em' }}>
          {hasUsedTrial ? 'Vamos continuar' : 'Antes de começar'}
        </Typography>
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, letterSpacing: '-0.02em', mt: 1, mb: 1.5, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}
        >
          {hasUsedTrial ? 'Escolha um plano para continuar' : 'Escolha o plano do seu negócio'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {hasUsedTrial
            ? 'Seu período de teste grátis já foi usado — assine um plano pra voltar a usar o Ka$hing.'
            : '30 dias grátis, sem cartão e sem fidelidade. Você escolhe o plano, o teste já começa depois.'}
        </Typography>
      </Box>

      <Box sx={{ width: '100%', maxWidth: 880 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <PlansGrid plans={plans ?? []} onSelectPlan={handleSelectPlan} disabled={startCheckout.isPending} />
        )}
      </Box>
    </Box>
  )
}
