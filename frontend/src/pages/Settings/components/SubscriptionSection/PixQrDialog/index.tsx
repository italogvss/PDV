import { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import ModalHeader from '../../../../../components/ModalHeader'
import { useSubscription } from '../../../../../hooks/useSubscription'
import { useToast } from '../../../../../hooks/useToast'
import type { PixQrDialogProps } from './types'

const POLL_MS = 3000

export default function PixQrDialog({ open, pix, onClose }: PixQrDialogProps) {
  const showToast = useToast()
  const [confirmed, setConfirmed] = useState(false)

  // Faz polling do /me até o webhook ativar a assinatura.
  const { data } = useSubscription(open && !confirmed ? POLL_MS : undefined)
  const isActivated = data?.status === 'Active' || data?.status === 'Trialing'

  useEffect(() => {
    if (open) setConfirmed(false)
  }, [open, pix?.chargeId])

  useEffect(() => {
    if (open && isActivated) setConfirmed(true)
  }, [open, isActivated])

  const copy = async () => {
    if (!pix) return
    await navigator.clipboard.writeText(pix.brCode)
    showToast('Código PIX copiado!', 'success')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <ModalHeader
        title={confirmed ? 'Pagamento confirmado!' : 'Pague com PIX'}
        subtitle={confirmed ? undefined : 'Escaneie o QR Code ou copie o código'}
        onClose={onClose}
      />

      <DialogContent sx={{ pt: 2, pb: 3 }}>
        {confirmed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2, textAlign: 'center' }}>
            <CheckCircleOutlined sx={{ fontSize: 56, color: 'success.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Sua assinatura está ativa.
            </Typography>
            <Button variant="contained" color="secondary" onClick={onClose} sx={{ mt: 1 }}>
              Concluir
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {pix?.brCodeBase64 ? (
              <Box
                component="img"
                src={pix.brCodeBase64}
                alt="QR Code PIX"
                sx={{ width: 220, height: 220, borderRadius: 2, border: 1, borderColor: 'border.subtle' }}
              />
            ) : null}

            <Button fullWidth variant="outlined" startIcon={<ContentCopyOutlined />} onClick={copy}>
              Copiar código copia e cola
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={14} />
              <Typography variant="caption">Aguardando confirmação do pagamento...</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
