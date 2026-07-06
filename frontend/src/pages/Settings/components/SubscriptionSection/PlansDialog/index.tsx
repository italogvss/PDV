import { Dialog, DialogContent, Typography, useMediaQuery, useTheme } from '@mui/material'
import ModalHeader from '../../../../../components/ModalHeader'
import PlansGrid from '../../../../../components/PlansGrid'
import type { PlansDialogProps } from './types'

export default function PlansDialog({ open, plans, onClose, onSelectPlan }: PlansDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <ModalHeader title="Escolha seu plano" subtitle="Compare os planos e assine em poucos cliques" onClose={onClose} />

      <DialogContent sx={{ pt: 1 }}>
        <PlansGrid plans={plans} onSelectPlan={onSelectPlan} />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          Ao escolher um plano, você é levado para a etapa de pagamento.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
