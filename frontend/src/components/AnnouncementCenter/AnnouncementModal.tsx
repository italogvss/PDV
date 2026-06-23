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
}

// Modal compartilhado para avisos (editoriais e de ciclo de vida). Fechar = marcar como visto.
export default function AnnouncementModal({
  open,
  title,
  children,
  onClose,
  ctaLabel,
  ctaUrl,
}: AnnouncementModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <ModalHeader title={title} onClose={onClose} />
      <DialogContent>{children}</DialogContent>
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
