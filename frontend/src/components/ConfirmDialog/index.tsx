import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, Paper, Typography } from '@mui/material'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import ModalHeader from '../ModalHeader'
import type { ConfirmDialogProps } from './types'

export default function ConfirmDialog({
  open,
  title,
  subtitle,
  description,
  confirmLabel,
  pendingLabel,
  isPending = false,
  onClose,
  onConfirm,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} disabled={isPending} />
      <DialogContent>
        {danger ? (
          <>
          <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          gap: 3,
          borderRadius: 2,
          borderColor:  'error.main',
          bgcolor:  'error.soft',
          color: 'error.ink',
        }}
      >
        <WarningAmberRounded sx={{ml: 2,fontSize: 25, mt: 0.25, flexShrink: 0 }} />
        <Typography variant="body2">{description}</Typography>
      </Paper>          
        </>) : (
          <DialogContentText>{description}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={onConfirm}
        >
          {isPending ? (pendingLabel ?? `${confirmLabel}...`) : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
