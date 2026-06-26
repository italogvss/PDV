import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from '@mui/material'
import { WarningAmberRounded } from '@mui/icons-material'
import ModalHeader from '../ModalHeader'
import type { ConfirmPhraseDialogProps } from './types'

export default function ConfirmPhraseDialog({
  open,
  onClose,
  title,
  subtitle = 'Esta ação é irreversível.',
  warningText,
  confirmPhrase,
  confirmButtonLabel,
  confirmButtonIcon,
  isPending,
  onConfirm,
}: ConfirmPhraseDialogProps) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const phraseMatches = typed === confirmPhrase

  function handleClose() {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <ModalHeader
        title={title}
        subtitle={subtitle}
        onClose={handleClose}
        disabled={isPending}
      />
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'error.soft',
            color: 'error.ink',
          }}
        >
          <WarningAmberRounded sx={{ fontSize: 22, mt: 0.25, flexShrink: 0 }} />
          <Typography variant="body2">{warningText}</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Para confirmar, escreva exatamente a frase abaixo:
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5, userSelect: 'none' }}
        >
          {confirmPhrase}
        </Typography>

        <TextField
          fullWidth
          size="small"
          autoComplete="off"
          placeholder={confirmPhrase}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={isPending}
          error={typed.length > 0 && !phraseMatches}
          helperText={
            typed.length > 0 && !phraseMatches
              ? 'A frase não confere (diferencia maiúsculas e minúsculas).'
              : ' '
          }
        />
      </DialogContent>
      <DialogActions>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : confirmButtonIcon}
          disabled={!phraseMatches || isPending}
          onClick={onConfirm}
        >
          {isPending ? 'Processando...' : confirmButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
