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
export default function SubscriptionExpiredModal() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const role = useAppSelector((s) => s.auth.role)
  const subscription = useAppSelector((s) => s.auth.subscription)
  const [dismissed, setDismissed] = useState(false)

  const isOwner = role === 'Owner' || role === 'Admin'
  const open = isOwner && !dismissed && subscription?.status === 'Expired'

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
          Sua assinatura expirou
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          O acesso ao sistema foi bloqueado. Ative um plano para continuar usando o Kashing.
        </Typography>

        <UpsellButton label="Ativar plano" fullWidth size="large" onBeforeNavigate={handleClose} />
        <Button variant="ghost" fullWidth sx={{ mt: 1 }} onClick={handleClose}>
          Agora não
        </Button>
      </Box>
    </Dialog>
  )
}
