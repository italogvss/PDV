import { Box, Button, CircularProgress, DialogActions, Typography } from '@mui/material'
import CheckRounded from '@mui/icons-material/CheckRounded'
import type { FormModalActionsProps } from './types'

const defaultHint = (
  <>
    Campos com{' '}
    <Typography variant="caption" sx={{color: "error.main"}}>
      *
    </Typography>{' '}
    são obrigatórios
  </>
)

/**
 * Rodapé padrão das modais de formulário — dica opcional de obrigatórios à esquerda,
 * "Cancelar" (ghost) + primário verde com spinner de loading à direita.
 * Suporta modo form (`formId`) ou modo click (`onSubmit`).
 */
export default function FormModalActions({
  onCancel,
  isPending,
  submitLabel,
  pendingLabel = 'Salvando...',
  formId,
  onSubmit,
  submitDisabled,
  showRequiredHint = true,
  hint,
}: FormModalActionsProps) {
  const leftHint = hint ?? (showRequiredHint ? defaultHint : null)
  return (
    <DialogActions sx={leftHint ? { justifyContent: 'space-between' } : undefined}>
      {leftHint && (
        <Typography variant="caption" color="text.tertiary">
          {leftHint}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type={formId ? 'submit' : 'button'}
          form={formId}
          onClick={onSubmit}
          variant="contained"
          disabled={isPending || submitDisabled}
          startIcon={
            isPending ? <CircularProgress size={14} color="inherit" /> : <CheckRounded />
          }
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </Box>
    </DialogActions>
  )
}
