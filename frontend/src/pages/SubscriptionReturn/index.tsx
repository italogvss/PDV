import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { CheckCircleOutlined as CheckCircleOutlineIcon, ScheduleOutlined as ScheduleOutlinedIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 30000

type Phase = 'processing' | 'confirmed' | 'timeout'

export default function SubscriptionReturnPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('processing')
  const startedAt = useRef(Date.now())

  // Enquanto processa, faz polling do /me até o webhook ativar (status pago).
  const { data } = useSubscription(phase === 'processing' ? POLL_INTERVAL_MS : undefined)

  const isActivated = useMemo(
    () => data?.status === 'Active' || data?.status === 'Trialing',
    [data?.status],
  )

  useEffect(() => {
    if (phase !== 'processing') return
    if (isActivated) {
      setPhase('confirmed')
      return
    }
    const elapsed = Date.now() - startedAt.current
    if (elapsed >= POLL_TIMEOUT_MS) {
      setPhase('timeout')
    }
  }, [phase, isActivated, data])

  const goToSubscription = () => navigate('/configuracoes?tab=assinatura')

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: 5,
          maxWidth: 460,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 2,
        }}
      >
        {phase === 'processing' && (
          <>
            <CircularProgress size={40} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, mt: 1 }}>
              Confirmando seu pagamento...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estamos validando a confirmação do pagamento. Isso pode levar alguns instantes.
            </Typography>
          </>
        )}

        {phase === 'confirmed' && (
          <>
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main' }} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, mt: 1 }}>
              Assinatura confirmada!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seu plano já está ativo. Aproveite todos os recursos.
            </Typography>
            <Button variant="contained" color="secondary" onClick={goToSubscription} sx={{ mt: 1 }}>
              Ir para assinatura
            </Button>
          </>
        )}

        {phase === 'timeout' && (
          <>
            <ScheduleOutlinedIcon sx={{ fontSize: 48, color: 'warning.main' }} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, mt: 1 }}>
              Pagamento em processamento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seu pagamento está sendo processado e pode levar alguns minutos para ser confirmado.
              Você pode acompanhar o status na página de assinatura.
            </Typography>
            <Button variant="contained" color="secondary" onClick={goToSubscription} sx={{ mt: 1 }}>
              Ir para assinatura
            </Button>
          </>
        )}
      </Paper>
    </Box>
  )
}
