import { Button } from '@mui/material'
import { useGoToPlans } from '../../hooks/useGoToPlans'
import type { Props } from './types'

// CTA dourado padrão de upsell — leva para a tela de planos. Embute o estilo premium e a navegação
// para não repetir o `sx` dourado nem a rota de assinatura em cada tela.
export default function UpsellButton({
  label = 'Ver planos Pro',
  fullWidth,
  size,
  onBeforeNavigate,
  sx,
}: Props) {
  const goToPlans = useGoToPlans()

  const handleClick = () => {
    onBeforeNavigate?.()
    goToPlans()
  }

  return (
    <Button
      variant="contained"
      fullWidth={fullWidth}
      size={size}
      onClick={handleClick}
      sx={{
        bgcolor: 'premium.400',
        color: 'premium.900',
        fontWeight: 700,
        '&:hover': { bgcolor: 'premium.500' },
        ...sx,
      }}
    >
      {label}
    </Button>
  )
}
