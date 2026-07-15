import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material'
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
  confirmDisabled = false,
  onClose,
  onConfirm,
  danger = false,
  requireAcknowledgment = false,
  acknowledgmentLabel = 'Li as informações acima e desejo continuar.',
}: ConfirmDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (open) setAcknowledged(false)
  }, [open])

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
        <Typography variant="body2" component="div">{description}</Typography>
      </Paper>
        </>) : (
          <DialogContentText component="div">{description}</DialogContentText>
        )}
        {requireAcknowledgment && (
          <FormControlLabel
            sx={{ mt: 2, mx: 0, alignItems: 'flex-start'}}
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={isPending}
                sx={{ p: 0, pr: 2, m: 0, ml: 2 }}
                size='small'
              />
            }
            label={<Typography variant="body2">{acknowledgmentLabel}</Typography>}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={isPending || confirmDisabled || (requireAcknowledgment && !acknowledged)}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={onConfirm}
        >
          {isPending ? (pendingLabel ?? `${confirmLabel}...`) : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
