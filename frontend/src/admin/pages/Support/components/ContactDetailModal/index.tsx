import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { ArchiveOutlined, DoneOutlined, MarkEmailUnreadOutlined } from '@mui/icons-material'
import ModalHeader from '../../../../../components/ModalHeader'
import StatusChip from '../../../../components/StatusChip'
import { CONTACT_CATEGORY, CONTACT_STATUS, REPRODUCIBILITY_LABEL } from '../../../../constants/statusMeta'
import { formatDateTime } from '../../../../utils/format'
import { useUpdateContactStatus } from '../../../../hooks/useAdmin'
import type { AdminContactMessage } from '../../../../types/admin.types'

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 0.5 }}>
      <Typography variant="caption" color="text.tertiary" sx={{ width: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function ContactDetailModal({
  message,
  onClose,
}: {
  message: AdminContactMessage | null
  onClose: () => void
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const updateStatus = useUpdateContactStatus()

  const open = message !== null

  const setStatus = (status: string) => {
    if (!message) return
    updateStatus.mutate({ id: message.id, status })
  }

  const isBug = message?.category === 'BugReport'
  const hasTechContext =
    message && (message.pageContext || message.appVersion || message.browser || message.screenResolution || message.platform)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      {message && (
        <>
          <ModalHeader title={message.subject || '(sem assunto)'} subtitle={`${message.senderName} · ${message.senderEmail}`} onClose={onClose} />
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StatusChip map={CONTACT_CATEGORY} value={message.category} />
              <StatusChip map={CONTACT_STATUS} value={message.status} />
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.tertiary">
                {formatDateTime(message.createdAt)}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2 }}>
              {message.body}
            </Typography>

            {isBug && (message.expectedBehavior || message.reproducibility) && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="overline" color="text.tertiary">
                  Detalhes do bug
                </Typography>
                <DetailRow label="Esperado" value={message.expectedBehavior} />
                <DetailRow
                  label="Reprodução"
                  value={message.reproducibility ? REPRODUCIBILITY_LABEL[message.reproducibility] ?? message.reproducibility : null}
                />
              </>
            )}

            {hasTechContext && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="overline" color="text.tertiary">
                  Contexto técnico
                </Typography>
                <DetailRow label="Página" value={message.pageContext} />
                <DetailRow label="Versão" value={message.appVersion} />
                <DetailRow label="Navegador" value={message.browser} />
                <DetailRow label="Resolução" value={message.screenResolution} />
                <DetailRow label="Plataforma" value={message.platform} />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ gap: 1, flexWrap: 'wrap' }}>
            {message.status !== 'Unread' && (
              <Button
                variant="ghost"
                startIcon={<MarkEmailUnreadOutlined />}
                disabled={updateStatus.isPending}
                onClick={() => setStatus('Unread')}
              >
                Reabrir
              </Button>
            )}
            {message.status !== 'Archived' && (
              <Button
                variant="ghost"
                startIcon={<ArchiveOutlined />}
                disabled={updateStatus.isPending}
                onClick={() => setStatus('Archived')}
              >
                Arquivar
              </Button>
            )}
            {message.status === 'Unread' && (
              <Button
                variant="contained"
                startIcon={<DoneOutlined />}
                disabled={updateStatus.isPending}
                onClick={() => setStatus('Read')}
              >
                Marcar como lida
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
