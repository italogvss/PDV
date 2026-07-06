import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'
import { useAppSelector } from '../../store'

const POLL_INTERVAL_MS = 3000
// Teto de espera exibido ao usuário — o polling em si continua esporádico (a cada 3s), só o
// limite máximo antes de declarar falha de comunicação sobe pra 1 minuto.
const POLL_TIMEOUT_MS = 60_000

type Phase = 'processing' | 'confirmed' | 'timeout'

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Tela cheia (sem DashboardLayout — o usuário pode ainda não ter tenant). Decide o próximo passo
// sozinha: sem tenant → guia pro onboarding; com tenant → volta pro painel.
export default function SubscriptionReturnPage() {
  const navigate = useNavigate()
  const tenantId = useAppSelector((s) => s.auth.tenantId)
  const [phase, setPhase] = useState<Phase>('processing')
  const [remainingMs, setRemainingMs] = useState(POLL_TIMEOUT_MS)
  const startedAt = useRef(Date.now())

  // Enquanto processa, faz polling esporádico do /me até o webhook ativar (status pago).
  const { data } = useSubscription(phase === 'processing' ? POLL_INTERVAL_MS : undefined)

  const isActivated = useMemo(
    () => data?.status === 'Active' || data?.status === 'Trialing',
    [data?.status],
  )

  // Ticker de UI (1s), independente da cadência do polling — só exibe o teto máximo de espera.
  useEffect(() => {
    if (phase !== 'processing') return
    const tick = () => setRemainingMs(Math.max(0, POLL_TIMEOUT_MS - (Date.now() - startedAt.current)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'processing') return
    if (isActivated) {
      setPhase('confirmed')
      return
    }
    if (Date.now() - startedAt.current >= POLL_TIMEOUT_MS) {
      setPhase('timeout')
    }
  }, [phase, isActivated, data])

  const goNext = () => navigate(tenantId ? '/' : '/criar-negocio')

  // No timeout, retoma o polling (o webhook costuma chegar logo depois) sem forçar o usuário a
  // recomeçar o checkout.
  const retry = () => {
    startedAt.current = Date.now()
    setRemainingMs(POLL_TIMEOUT_MS)
    setPhase('processing')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: 2,
        bgcolor: 'surface.default',
        backgroundImage: (t) =>
          `radial-gradient(60% 50% at 15% 0%, ${alpha(t.palette.accent[300], 0.24)} 0%, transparent 60%),` +
          `radial-gradient(50% 45% at 100% 100%, ${alpha(t.palette.premium[300], 0.26)} 0%, transparent 55%)`,
      }}
    >
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
            <Typography variant="caption" color="text.tertiary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              Aguardando confirmação — até {formatCountdown(remainingMs)}
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
              {tenantId
                ? 'Seu plano já está ativo. Aproveite todos os recursos.'
                : 'Agora vamos criar o seu negócio.'}
            </Typography>
            <Button variant="contained" color="secondary" onClick={goNext} sx={{ mt: 1 }}>
              {tenantId ? 'Ir para o painel' : 'Criar meu negócio'}
            </Button>
          </>
        )}

        {phase === 'timeout' && (
          <>
            <ErrorOutlineRoundedIcon sx={{ fontSize: 48, color: 'error.main' }} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700, mt: 1 }}>
              Falha na comunicação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Não conseguimos confirmar seu pagamento a tempo. Se o valor foi cobrado, não se
              preocupe — tente verificar de novo ou fale com a gente que resolvemos rapidinho.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1, width: '100%', mt: 1 }}>
              <Button variant="contained" color="secondary" onClick={retry}>
                Verificar novamente
              </Button>
              <Button variant="outlined" color="secondary" onClick={goNext}>
                {tenantId ? 'Ir para o painel' : 'Continuar cadastro'}
              </Button>
              <Button
                variant="text"
                color="secondary"
                href="mailto:italo.gavassi@gmail.com?subject=Pagamento%20n%C3%A3o%20confirmado"
              >
                Entrar em contato
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  )
}
