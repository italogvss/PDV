import { Box, CircularProgress, Typography, useTheme } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import { Navigate, useNavigate } from 'react-router-dom'
import PlansGrid from '../../components/PlansGrid'
import { usePlans, useSubscription, useStartCheckout } from '../../hooks/useSubscription'
import { getStoredPlanSlug, setStoredPlanSlug } from '../../utils/planSelection'
import type { Plan } from '../../types/subscription.types'

// Mesmo espírito do Login (gradiente radial sutil), com um tom premium dourado a mais — esta é a
// tela que decide o plano, então ecoa a cor do upsell/banner Profissional. Compartilhado entre o
// estado de carregamento e o conteúdo, pra não piscar fundo diferente enquanto o catálogo chega.
const pageSx = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  bgcolor: 'surface.default',
  px: 2,
  py: { xs: 6, md: 8 },
  backgroundImage: (t: Theme) =>
    `radial-gradient(60% 50% at 12% 0%, ${alpha(t.palette.accent[300], 0.24)} 0%, transparent 60%),` +
    `radial-gradient(55% 45% at 100% 0%, ${alpha(t.palette.premium[300], 0.3)} 0%, transparent 55%)`,
} satisfies SxProps<Theme>

// Tela cheia pós-login de quem ainda não tem loja (`resolvePostLoginPath`). Quem nunca usou trial
// escolhe o plano e segue pro onboarding (trial de 30 dias inicia lá); quem já usou vai direto pro
// checkout — sem passar pelo onboarding antes de pagar.
//
// Esta tela é também o **portão de validação do slug da landing**: quem chegou com um `?plano=`
// válido é encaminhado direto pro onboarding (mantendo o funil curto da grade de preços), e quem
// chegou com slug desconhecido cai na grade em vez de criar uma loja sem trial.
export default function ChoosePlanPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data: plans, isLoading: loadingPlans } = usePlans()
  const { data: subscription, isLoading: loadingSubscription } = useSubscription()
  const startCheckout = useStartCheckout()

  const logoSrc = theme.palette.mode === 'dark' ? '/logo-white.png' : '/logo-black.png'
  const hasUsedTrial = subscription?.hasUsedTrial ?? false
  const loading = loadingPlans || loadingSubscription

  // O slug vindo da landing é só uma sugestão: só vale se existir no catálogo (o backend é a fonte,
  // nunca uma lista de slugs espelhada aqui). Slug desconhecido — ex.: `?plano=profissional` de um
  // link antigo — simplesmente não encaminha, e o usuário escolhe na grade.
  const planFromLanding = plans?.find((p) => p.slug === getStoredPlanSlug()) ?? null

  const handleSelectPlan = (plan: Plan) => {
    if (hasUsedTrial) {
      // Cancelar/abandonar o pagamento volta pra cá (não pra Configurações — ainda não há tenant).
      startCheckout.mutate({ planId: plan.id, returnUrl: `${window.location.origin}/planos` })
      return
    }
    setStoredPlanSlug(plan.slug)
    navigate('/criar-negocio')
  }

  // Espera o catálogo antes de decidir: sem ele não há como saber se o slug guardado é válido, e
  // renderizar o título aqui só pra encaminhar em seguida daria um flash de tela trocada.
  if (loading) {
    return (
      <Box sx={{ ...pageSx, justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Veio da grade de preços com um plano real escolhido: segue direto pro onboarding.
  if (planFromLanding && !hasUsedTrial) return <Navigate to="/criar-negocio" replace />

  return (
    <Box sx={pageSx}>
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
        <PlansGrid plans={plans ?? []} onSelectPlan={handleSelectPlan} disabled={startCheckout.isPending} />
      </Box>
    </Box>
  )
}
