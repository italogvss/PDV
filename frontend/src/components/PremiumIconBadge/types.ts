import type { SvgIconComponent } from '@mui/icons-material'
import type { SxProps, Theme } from '@mui/material/styles'

export interface Props {
  // Escala fixa: sm=32 · md=36 · lg=52 · xl=64.
  size?: 'sm' | 'md' | 'lg' | 'xl'
  // Tom dourado: solid (destaque/ação) · soft (cabeçalho de diálogo, ticks) · muted (discreto).
  tone?: 'solid' | 'soft' | 'muted'
  shape?: 'circle' | 'rounded'
  // Ícone exibido (default: selo premium). Ex.: CheckRounded nos ticks da UpsellModal.
  icon?: SvgIconComponent
  // Sombra elevada. Default: só no tom solid.
  elevated?: boolean
  sx?: SxProps<Theme>
}
