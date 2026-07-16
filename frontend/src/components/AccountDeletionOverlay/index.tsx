import { useState } from 'react'
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import DeleteForeverOutlined from '@mui/icons-material/DeleteForeverOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../store'
import { clearAuth } from '../../store/slices/auth.slice'
import { authService } from '../../services/auth.service'
import { reportService } from '../../services/report.service'
import { EXPORT_CATEGORIES } from '../../pages/Settings/types'
import { useCancelAccountDeletion } from '../../hooks/useAccountDeletion'
import { useToast } from '../../hooks/useToast'
import type { Props } from './types'

// Tela cheia exibida quando a carência de exclusão já começou: a conta está bloqueada para uso.
// Autossuficiente (as demais rotas respondem 423) — só oferece as ações permitidas: baixar os dados,
// reativar a conta ou sair. Reativar NÃO restaura a assinatura.
export default function AccountDeletionOverlay({ scheduledDeletionAt }: Props) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const showToast = useToast()
  const reactivate = useCancelAccountDeletion()
  const [exporting, setExporting] = useState<string | null>(null)

  const daysLeft = scheduledDeletionAt
    ? Math.max(0, Math.ceil((new Date(scheduledDeletionAt).getTime() - Date.now()) / 86_400_000))
    : null

  const handleExport = async (category: string) => {
    setExporting(category)
    try {
      await reportService.exportCsv(category)
    } catch {
      showToast('Não foi possível exportar. Tente novamente.', 'error')
    } finally {
      setExporting(null)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      /* ignora — segue com o logout local */
    }
    dispatch(clearAuth())
    navigate('/login')
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 2,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        overflow: 'auto',
      }}
    >
      <Paper
        variant="outlined"
        sx={{ maxWidth: 560, width: '100%', p: { xs: 3, md: 5 }, borderRadius: 3, textAlign: 'center' }}
      >
        <DeleteForeverOutlined sx={{ fontSize: 48, color: 'error.main' }} />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>
          Conta em processo de exclusão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {daysLeft === null
            ? 'Sua conta está bloqueada durante o período de carência.'
            : daysLeft === 0
              ? 'Seus dados serão excluídos definitivamente hoje.'
              : `Seus dados serão excluídos definitivamente em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` +
                (scheduledDeletionAt ? ` (${new Date(scheduledDeletionAt).toLocaleDateString('pt-BR')}).` : '.')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Durante a carência a conta fica bloqueada para uso. Você pode reativá-la ou baixar seus dados
          abaixo. Reativar não restaura a assinatura.
        </Typography>

        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="overline" sx={{ fontWeight: 700 }}>
            Baixar meus dados
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {EXPORT_CATEGORIES.map((c) => (
              <Button
                key={c.id}
                size="small"
                variant="outlined"
                startIcon={exporting === c.id ? <CircularProgress size={14} /> : <DownloadOutlined />}
                disabled={exporting !== null}
                onClick={() => handleExport(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
          <Button
            fullWidth
            variant="contained"
            color="error"
            disabled={reactivate.isPending}
            startIcon={reactivate.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => reactivate.mutate()}
          >
            Reativar conta
          </Button>
          <Button fullWidth variant="outlined" onClick={handleLogout}>
            Sair
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
