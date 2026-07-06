import { alpha, type SxProps, type Theme } from '@mui/material/styles'

// Superfície tracejada dourada usada nos placeholders de upsell (UpsellCard, teaser inline de
// despesa recorrente). Centraliza o border dashed premium + fundo alpha e o hover, para o motivo
// dourado ficar idêntico em todo lugar. Passe hover=false quando a superfície não for clicável.
export function premiumDashedSurfaceSx(hover = true): SxProps<Theme> {
  return {
    borderStyle: 'dashed',
    borderColor: 'premium.400',
    bgcolor: (t) => alpha(t.palette.premium[100], 0.4),
    ...(hover && {
      cursor: 'pointer',
      transition: 'background-color .15s',
      '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.premium[200], 0.6) },
    }),
  }
}
