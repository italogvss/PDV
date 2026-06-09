import { Typography } from '@mui/material'
import type { FieldLabelProps } from './types'

/**
 * Label externo padrão dos formulários — caption acima do input, com asterisco
 * opcional de campo obrigatório. Único ponto de verdade para o estilo de label.
 */
export default function FieldLabel({ label, required, inline }: FieldLabelProps) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 500,
        color: 'text.secondary',
        display: inline ? 'inline' : 'block',
        mb: inline ? 0 : 0.5,
      }}
    >
      {label}
      {required && (
        <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.25 }}>
          *
        </Typography>
      )}
    </Typography>
  )
}
