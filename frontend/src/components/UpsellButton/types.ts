import type { ButtonProps } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

export interface Props {
  label?: string
  fullWidth?: boolean
  size?: ButtonProps['size']
  // Executado antes de navegar (ex.: fechar a modal que contém o botão).
  onBeforeNavigate?: () => void
  sx?: SxProps<Theme>
}
