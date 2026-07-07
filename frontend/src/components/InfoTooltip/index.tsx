import InfoOutlined from '@mui/icons-material/InfoOutlined'
import { Tooltip } from '@mui/material'
import type { Props } from './types'

// Ícone de ajuda com tooltip explicativo — usado no cabeçalho de gráficos para
// esclarecer o que os números significam. Funciona no hover e no toque (mobile).
export default function InfoTooltip({ title }: Props) {
  return (
    <Tooltip title={title} arrow enterTouchDelay={0} leaveTouchDelay={4000}>
      <InfoOutlined sx={{ fontSize: 15, color: 'text.tertiary', cursor: 'help', flex: '0 0 auto' }} />
    </Tooltip>
  )
}
