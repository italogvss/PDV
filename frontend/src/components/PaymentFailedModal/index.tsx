import { useState } from 'react'
import { Box, Button, Dialog, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CreditCardOffOutlined from '@mui/icons-material/CreditCardOffOutlined'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store'

// Aviso de cobrança recusada. A renovação falhou e o gateway ainda está retentando: o usuário
// precisa saber o que aconteceu antes de esbarrar nos 402. Aparece uma vez por sessão (dispensado
// some até um novo mount do layout, ou seja, próximo login/reload) — o detalhe permanente fica na
// SubscriptionSection. Só para Owner/Admin, os únicos que podem assinar.
export default function PaymentFailedModal() {
  const theme = useTheme()
  const navigate = useNavigate()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const role = useAppSelector((s) => s.auth.role)
  const subscription = useAppSelector((s) => s.auth.subscription)
  const [dismissed, setDismissed] = useState(false)

  const isOwner = role === 'Owner' || role === 'Admin'
  const open = isOwner && !dismissed && Boolean(subscription?.lastPaymentFailedAt)

  const handleClose = () => setDismissed(true)

  const goToSubscription = () => {
    handleClose()
    navigate('/configuracoes?tab=assinatura')
  }

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

        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: 'error.soft',
            color: 'error.ink',
          }}
        >
          <CreditCardOffOutlined fontSize="large" />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Não conseguimos cobrar seu cartão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          A renovação da sua assinatura foi recusada e o acesso ao sistema ficará bloqueado até que um
          pagamento seja concluído. Assine novamente para continuar usando o Kashing.
        </Typography>

        <Button variant="contained" color="error" fullWidth size="large" onClick={goToSubscription}>
          Assinar novamente
        </Button>
        <Button variant="ghost" fullWidth sx={{ mt: 1 }} onClick={handleClose}>
          Agora não
        </Button>
      </Box>
    </Dialog>
  )
}
