import { useState } from 'react'
import { Box, Button, Dialog, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined'
import PremiumIconBadge from '../PremiumIconBadge'
import UpsellButton from '../UpsellButton'
import { useAppSelector } from '../../store'

// Modal global de conversão (RF-01.4/RF-07.4): aparece quando a assinatura do Owner está
// `Expired` — trial vencido sem conversão, assinatura paga vencida sem renovação, ou
// reembolso/chargeback. Chama para ativar um plano; não bloqueia a navegação (os recursos já
// estão barrados por 402), só reforça a ação. Só para Owner/Admin — só eles podem assinar
// (aba "Assinatura" de Configurações é `ownerOnly`). Dispensável por sessão: some ao clicar em
// "Agora não" e só reaparece em um novo mount do layout (login/reload).
//
// `devForceOpen` — DEV TEMPORÁRIO: força a abertura para revisão visual sem expirar a assinatura
// real. Ver instrução de remoção em DashboardLayout/index.tsx (busque por "DEV TEMPORÁRIO").
export default function SubscriptionExpiredModal({ devForceOpen }: { devForceOpen?: boolean } = {}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const role = useAppSelector((s) => s.auth.role)
  const subscription = useAppSelector((s) => s.auth.subscription)
  const [dismissed, setDismissed] = useState(false)

  const isOwner = role === 'Owner' || role === 'Admin'
  // Quando o acesso caiu por cobrança recusada, o PaymentFailedModal explica melhor o motivo —
  // ele tem precedência para os dois não abrirem ao mesmo tempo.
  const paymentFailed = Boolean(subscription?.lastPaymentFailedAt)
  // `None` = tenant cujo Owner não tem assinatura nenhuma. Não deveria acontecer (o trial é
  // concedido no onboarding), mas quando acontecia o usuário só via toasts de 402 sem explicação —
  // app inteiro bloqueado e nada dizendo o motivo. Aqui ele pelo menos entende e tem para onde ir.
  const noPlan = subscription?.status === 'None'
  const open =
    Boolean(devForceOpen) ||
    (isOwner && !dismissed && !paymentFailed && (subscription?.status === 'Expired' || noPlan))

  const handleClose = () => setDismissed(true)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <Box sx={{ position: 'relative', p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: 'text.tertiary' }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>

        <PremiumIconBadge size="xl" tone="soft" icon={WorkspacePremiumOutlined} sx={{ mx: 'auto', mb: 2 }} />

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {noPlan ? 'Ative um plano para usar o Kashing' : 'Sua assinatura expirou'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          {noPlan
            ? 'Sua loja está criada, mas ainda não há um plano ativo nela — por isso os recursos aparecem bloqueados. Escolha um plano para liberar o Kashing.'
            : 'O acesso ao sistema foi bloqueado, mas você ainda pode acessar seus dados. Ative um plano para continuar usando o Kashing.'}
        </Typography>

        <UpsellButton label="Ativar plano" fullWidth size="large" onBeforeNavigate={handleClose} />
        <Button variant="ghost" fullWidth sx={{ mt: 1 }} onClick={handleClose}>
          Agora não
        </Button>
      </Box>
    </Dialog>
  )
}
