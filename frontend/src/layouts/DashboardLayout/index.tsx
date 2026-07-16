import { useEffect, useState } from 'react'
import { Box, FormControlLabel, Paper, Switch, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import AnnouncementCenter from '../../components/AnnouncementCenter'
import SubscriptionExpiredModal from '../../components/SubscriptionExpiredModal'
import PaymentFailedModal from '../../components/PaymentFailedModal'
import DataDeletionBanner from '../../components/DataDeletionBanner'
import AccountDeletionBanner from '../../components/AccountDeletionBanner'
import AccountDeletionOverlay from '../../components/AccountDeletionOverlay'
import { useSyncSubscriptionToStore } from '../../hooks/useSubscription'
import { useAccountDeletionStatus } from '../../hooks/useAccountDeletion'

export default function DashboardLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  // Mantém o resumo da assinatura no auth slice sincronizado com o backend.
  useSyncSubscriptionToStore()

  // Estado do encerramento de conta — dirige a faixa (pré-carência) e a tela cheia (bloqueado).
  const { data: accountDeletion } = useAccountDeletionStatus()
  const deletionPending = accountDeletion?.pending ?? false
  const deletionBlocked = accountDeletion?.blocked ?? false

  // ═══ DEV TEMPORÁRIO — REMOVER ═══════════════════════════════════════════════════════════
  // Switches para forçar os avisos/modais globais de assinatura (renderizados abaixo, fora do
  // fluxo normal de páginas) sem precisar agendar exclusão, expirar ou recusar uma cobrança de
  // verdade. Para remover: apague estes 3 estados, o painel <Paper> logo abaixo e as props
  // `devForceShow`/`devForceOpen` passadas para DataDeletionBanner/SubscriptionExpiredModal/
  // PaymentFailedModal (as props também precisam ser removidas dos 3 componentes — busque por
  // "DEV TEMPORÁRIO" em cada um).
  const [devShowDeletion, setDevShowDeletion] = useState(false)
  const [devShowExpired, setDevShowExpired] = useState(false)
  const [devShowPaymentFailed, setDevShowPaymentFailed] = useState(false)
  // ═════════════════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        height: { md: '100vh' },
        bgcolor: 'background.default',
      }}
    >
      <Sidebar
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <TopBar isMobile={isMobile} onMenuClick={() => setMobileOpen(true)} />
        {/* Persistente: enquanto a exclusão estiver agendada, o prazo acompanha o usuário em toda rota.
            O encerramento de conta tem precedência sobre a retenção passiva (evita faixa dupla). */}
        {deletionPending
          ? !deletionBlocked && <AccountDeletionBanner scheduledDeletionAt={accountDeletion?.scheduledDeletionAt ?? null} />
          : <DataDeletionBanner devForceShow={devShowDeletion} />}
        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: { xs: 'visible', md: 'auto' },
            p: { xs: 4, md: 6 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <AnnouncementCenter />
      <SubscriptionExpiredModal devForceOpen={devShowExpired} />
      <PaymentFailedModal devForceOpen={devShowPaymentFailed} />
      {/* Carência ativa: tela cheia bloqueando o uso, com exportar/reativar/sair. */}
      {deletionBlocked && (
        <AccountDeletionOverlay scheduledDeletionAt={accountDeletion?.scheduledDeletionAt ?? null} />
      )}

      {/* ══ DEV TEMPORÁRIO — painel para forçar os avisos/modais globais de assinatura. Ver
          instrução de remoção no bloco de estados `devShow*` acima. ══ */}
      <Paper
        variant="outlined"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: theme.zIndex.tooltip + 1,
          borderRadius: 2,
          borderStyle: 'dashed',
          borderColor: 'warning.main',
          bgcolor: 'warning.soft',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
        }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, color: 'warning.ink', letterSpacing: '0.06em' }}>
          Dev — assinatura (remover)
        </Typography>
        <FormControlLabel
          control={
            <Switch size="small" checked={devShowDeletion} onChange={(e) => setDevShowDeletion(e.target.checked)} />
          }
          label="Banner: exclusão agendada"
        />
        <FormControlLabel
          control={
            <Switch size="small" checked={devShowExpired} onChange={(e) => setDevShowExpired(e.target.checked)} />
          }
          label="Modal: assinatura expirada"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={devShowPaymentFailed}
              onChange={(e) => setDevShowPaymentFailed(e.target.checked)}
            />
          }
          label="Modal: cobrança recusada"
        />
      </Paper>
    </Box>
  )
}
