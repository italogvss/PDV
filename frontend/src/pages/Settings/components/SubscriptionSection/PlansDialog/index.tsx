import { Dialog, DialogContent, Typography, useMediaQuery, useTheme } from '@mui/material'
import ModalHeader from '../../../../../components/ModalHeader'
import PlansGrid from '../../../../../components/PlansGrid'
import type { PlansDialogProps } from './types'

const COPY = {
  checkout: {
    title: 'Escolha seu plano',
    subtitle: 'Compare os planos e assine em poucos cliques',
    ctaLabel: 'Assinar agora',
    footnote: 'Ao escolher um plano, você é levado para a etapa de pagamento.',
  },
  change: {
    title: 'Trocar de plano',
    subtitle: 'Compare os planos e escolha para onde quer ir',
    ctaLabel: 'Mudar para este plano',
    footnote: 'Nenhuma cobrança é feita agora — o valor do novo plano entra na próxima renovação.',
  },
} as const

export default function PlansDialog({
  open,
  plans,
  onClose,
  onSelectPlan,
  mode = 'checkout',
  currentPlanId = null,
}: PlansDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const copy = COPY[mode]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <ModalHeader title={copy.title} subtitle={copy.subtitle} onClose={onClose} />

      <DialogContent sx={{ pt: 1 }}>
        <PlansGrid
          plans={plans}
          onSelectPlan={onSelectPlan}
          ctaLabel={copy.ctaLabel}
          currentPlanId={mode === 'change' ? currentPlanId : null}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          {copy.footnote}
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
