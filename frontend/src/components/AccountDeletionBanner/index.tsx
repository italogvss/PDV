import { Box, Button, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DeleteForeverOutlined from '@mui/icons-material/DeleteForeverOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import { useNavigate } from 'react-router-dom'
import { useCancelAccountDeletion } from '../../hooks/useAccountDeletion'
import type { Props } from './types'

// Faixa informativa quando há encerramento de conta agendado mas a carência ainda NÃO começou
// (Path B: o Owner mantém acesso normal até o fim do plano). Distinta do DataDeletionBanner
// (retenção passiva por perda de plano). Sempre reversível enquanto o prazo estiver no futuro.
export default function AccountDeletionBanner({ scheduledDeletionAt }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const reactivate = useCancelAccountDeletion()

  if (!scheduledDeletionAt) return null
  const dateLabel = new Date(scheduledDeletionAt).toLocaleDateString('pt-BR')

  return (
    <Box
      sx={{
        px: { xs: 3, md: 4 },
        py: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        gap: 2,
        bgcolor: 'error.soft',
        borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
      }}
    >
      <DeleteForeverOutlined sx={{ color: 'error.ink', flexShrink: 0 }} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.ink' }}>
          Encerramento de conta agendado
        </Typography>
        <Typography variant="caption" sx={{ color: 'error.ink' }}>
          Sua conta e todos os seus negócios serão encerrados em {dateLabel}. Você pode reativar a
          conta ou baixar seus dados a qualquer momento até lá.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DownloadOutlined />}
          onClick={() => navigate('/configuracoes?tab=backup')}
        >
          Baixar meus dados
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate()}
        >
          Reativar conta
        </Button>
      </Stack>
    </Box>
  )
}
