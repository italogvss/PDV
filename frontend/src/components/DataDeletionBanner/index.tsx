import { Box, Button, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DeleteForeverOutlined from '@mui/icons-material/DeleteForeverOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store'

// Faixa persistente exibida quando a loja está com exclusão definitiva agendada — o que acontece
// depois que o plano cai (cancelamento, trial vencido, reembolso) ou quando nunca houve assinatura.
// Diferente do SubscriptionExpiredModal, NÃO é dispensável: o prazo corre e os dados somem no fim
// dele. Os dois caminhos de saída são exportar os dados ou voltar a assinar.
//
// `devForceShow` — DEV TEMPORÁRIO: força a exibição para revisão visual sem agendar uma exclusão
// real. Ver instrução de remoção em DashboardLayout/index.tsx (busque por "DEV TEMPORÁRIO").
export default function DataDeletionBanner({ devForceShow }: { devForceShow?: boolean } = {}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const tenantId = useAppSelector((s) => s.auth.tenantId)
  const tenants = useAppSelector((s) => s.auth.tenants)
  const role = useAppSelector((s) => s.auth.role)

  const current = tenants.find((t) => t.tenantId === tenantId)
  const deletionAt = current?.scheduledDeletionAt ?? (devForceShow ? new Date(Date.now() + 5 * 86_400_000).toISOString() : null)
  if (!deletionAt) return null

  const daysLeft = Math.max(0, Math.ceil((new Date(deletionAt).getTime() - Date.now()) / 86_400_000))
  const isOwner = role === 'Owner' || role === 'Admin'

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
          {daysLeft === 0
            ? 'Seus dados serão excluídos hoje'
            : `Seus dados serão excluídos em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}
        </Typography>
        <Typography variant="caption" sx={{ color: 'error.ink' }}>
          Sem um plano ativo, esta loja e todo o seu histórico serão apagados definitivamente em{' '}
          {new Date(deletionAt).toLocaleDateString('pt-BR')}. Baixe seus dados ou reative sua assinatura.
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
        {isOwner && (
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => navigate('/configuracoes?tab=assinatura')}
          >
            Assinar um plano
          </Button>
        )}
      </Stack>
    </Box>
  )
}
