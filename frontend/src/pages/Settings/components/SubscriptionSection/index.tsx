import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckIcon from '@mui/icons-material/Check'
import {
  useSubscription,
  usePlans,
  useCancelSubscription,
  useChangePlan,
} from '../../../../hooks/useSubscription'
import { OPERATION_MODULES, type OperationModule } from '../../../../constants/modules'
import type { PixCharge, Plan } from '../../../../types/subscription.types'
import { STATUS_CONFIG, formatPrice, getStatusLine } from './helpers'
import PlanCheckoutDialog from './PlanCheckoutDialog'
import PixQrDialog from './PixQrDialog'

export default function SubscriptionSection() {
  const { data: subscription, isLoading: loadingSub } = useSubscription()
  const { data: plans, isLoading: loadingPlans } = usePlans()
  const changePlan = useChangePlan()
  const cancel = useCancelSubscription()

  // Checkout em duas etapas: PlanCheckoutDialog (método/período/cupom) → PixQrDialog (QR PIX).
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null)
  const [pixCharge, setPixCharge] = useState<PixCharge | null>(null)

  useEffect(() => {
    console.log(plans)
  
  }, [plans])
  
  if (loadingSub || loadingPlans || !subscription || !plans) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const currentPlan = plans.find((p) => p.id === subscription.planId)
  const status = STATUS_CONFIG[subscription.status]
  const isPaid = subscription.planId !== null
  // Assinatura "viva" (em vigor): troca de plano (cartão) usa change-plan; senão é nova contratação.
  const isLive = subscription.status === 'Active' || subscription.status === 'Trialing'
  const canCancel = isPaid && isLive
  // Cancelada → pode reativar a qualquer momento (novo checkout), mesmo dentro do período já pago.
  const isCanceled = subscription.status === 'Canceled'

  const statusLine = getStatusLine(subscription)

  // Módulos liberados pelo plano → labels do registro central de módulos.
  const includedModules = subscription.modules
    .filter((m): m is OperationModule => m in OPERATION_MODULES)
    .map((m) => OPERATION_MODULES[m].label)

  // Planos visíveis: oculta planos com trial para usuários que já usaram trial.
  const visiblePlans = plans.filter(
    (p) => !(p.trialDays !== null && subscription.hasUsedTrial),
  )

  // Cartão vivo → troca de plano imediata (change-plan); demais estados (cancelada, expirada,
  // gratuito) → novo checkout, que reativa/contrata reaproveitando a mesma assinatura no backend.
  const handlePlanAction = (plan: Plan) => {
    if (isLive && subscription.method === 'Card') {
      if (plan.id === subscription.planId) return
      changePlan.mutate(plan.id)
    } else {
      setCheckoutPlan(plan)
    }
  }

  const handleCancel = () => {
    // Em trial o acesso encerra imediatamente; pós-trial mantém acesso até o fim do período.
    const message =
      subscription.status === 'Trialing'
        ? 'Ao cancelar agora seu período de teste termina imediatamente e você volta ao plano gratuito. Tem certeza?'
        : 'Tem certeza que deseja cancelar sua assinatura?'
    if (window.confirm(message)) {
      cancel.mutate()
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Plan banner */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: 1,
          borderColor: 'premium.200',
          bgcolor: 'premium.50',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: 'premium.400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WorkspacePremiumIcon sx={{ fontSize: 28, color: 'premium.900' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
              Plano {currentPlan?.name ?? subscription.planName ?? 'Gratuito'}
            </Typography>
            <Chip
              label={status.label}
              size="small"
              sx={{
                bgcolor: status.chipBg,
                color: status.chipColor,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.04em',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {isPaid && statusLine
              ? `${statusLine.label} ${statusLine.date}${currentPlan ? ` • R$ ${formatPrice(currentPlan.Price)}/mês` : ''}`
              : 'Plano gratuito — sem cobranças'}
          </Typography>
        </Box>

        {canCancel && (
          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CancelOutlinedIcon />}
              color="inherit"
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              Cancelar plano
            </Button>
          </Box>
        )}
      </Box>

      {/* Features */}
      {includedModules.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 4, py: 3 }}>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
              Recursos inclusos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tudo que faz parte do seu plano
            </Typography>
          </Box>
          <Divider />
          <Box
            sx={{
              px: 4,
              py: 3,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
            }}
          >
            {includedModules.map((feature) => (
              <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                <Typography variant="body2" color="text.primary">
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Other plans */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Planos disponíveis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subscription.hasUsedTrial
              ? 'Planos com trial foram ocultados pois você já utilizou o período gratuito'
              : 'Faça upgrade ou downgrade a qualquer momento'}
          </Typography>
        </Box>
        <Divider />
        <Box
          sx={{
            p: 3,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(visiblePlans.length, 4)}, 1fr)`,
            gap: 2,
          }}
        >
          {visiblePlans.map((plan) => {
            const isCurrent = plan.id === subscription.planId
            const isCurrentLive = isCurrent && isLive
            const pendingThis = changePlan.isPending && changePlan.variables === plan.id

            const disabled = isCurrentLive || changePlan.isPending

            const label = pendingThis
              ? 'Alterando...'
              : isCurrentLive
                ? 'Plano atual'
                : isLive
                  ? 'Trocar plano'
                  : isCanceled
                    ? 'Reativar'
                    : 'Assinar'

            return (
              <Box
                key={plan.id}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: 2,
                  borderColor: isCurrent ? 'secondary.main' : 'border.subtle',
                  bgcolor: isCurrent ? 'success.soft' : 'background.paper',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 700 }}>
                    {plan.name}
                  </Typography>
                  {isCurrent && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                      <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600 }}>
                        Atual
                      </Typography>
                    </Box>
                  )}
                  {plan.trialDays !== null && (
                    <Chip label={`${plan.trialDays} dias grátis`} size="small" color="info" variant="outlined" sx={{ fontSize: 10 }} />
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    R$
                  </Typography>
                  <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
                    {formatPrice(plan.Price)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /mês
                  </Typography>
                </Box>

                {plan.description && (
                  <Typography variant="caption" color="text.secondary">
                    {plan.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1 }}>
                  {plan.modules
                    .filter((m): m is OperationModule => m in OPERATION_MODULES)
                    .map((m) => (
                      <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                        <Typography variant="caption" color="text.primary">
                          {OPERATION_MODULES[m].label}
                        </Typography>
                      </Box>
                    ))}
                </Box>

                <Box sx={{ mt: 'auto' }}>
                    <Button
                      variant={isCurrentLive ? 'outlined' : 'contained'}
                      color={isCurrentLive ? 'inherit' : 'secondary'}
                      size="small"
                      fullWidth
                      disabled={disabled}
                      onClick={() => handlePlanAction(plan)}
                    >
                      {label}
                    </Button>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Paper>

      <PlanCheckoutDialog
        open={checkoutPlan !== null}
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
      />
      <PixQrDialog open={pixCharge !== null} pix={pixCharge} onClose={() => setPixCharge(null)} />
    </Box>
  )
}
