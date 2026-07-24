import type { ReactNode } from 'react'
import { Button, Dialog, DialogActions, DialogContent } from '@mui/material'
import ModalHeader from '../ModalHeader'

interface AnnouncementModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  ctaLabel?: string
  ctaUrl?: string
  /**
   * Permite fechar clicando fora ou com ESC. Default `false`: como fechar marca o aviso como visto
   * PARA SEMPRE (marker no backend), um clique acidental no backdrop descartaria o aviso de vez.
   * Sem `onClose` o Modal do MUI ignora backdrop e ESC (ver Modal/useModal.js) — sobram o X do
   * cabeçalho e o "Entendi", que são dispensas deliberadas. Só o preview do admin liga isso.
   */
  dismissible?: boolean
}

// Modal compartilhado para avisos (editoriais e de ciclo de vida). Fechar = marcar como visto.
export default function AnnouncementModal({
  open,
  title,
  children,
  onClose,
  ctaLabel,
  ctaUrl,
  dismissible = false,
}: AnnouncementModalProps) {
  return (
    <Dialog open={open} onClose={dismissible ? onClose : undefined} maxWidth="md" fullWidth>
      {title && <ModalHeader title={title} onClose={onClose} />}
      <DialogContent sx={{pt: title ? 0 : 4}}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {ctaLabel && ctaUrl && (
          <Button
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="secondary"
            onClick={onClose}
          >
            {ctaLabel}
          </Button>
        )}
        <Button onClick={onClose} variant="contained" color="secondary">
          Entendi
        </Button>
      </DialogActions>
    </Dialog>
  )
}
