import { useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, TextField, Typography } from '@mui/material'
import ModalHeader from '../../../../../components/ModalHeader'
import FieldLabel from '../../../../../components/FieldLabel'
import FormModalActions from '../../../../../components/FormModalActions'
import { useStartCheckout } from '../../../../../hooks/useSubscription'
import { formatPrice } from '../helpers'
import type { PlanCheckoutDialogProps } from './types'

export default function PlanCheckoutDialog({ open, plan, onClose }: PlanCheckoutDialogProps) {
  const checkout = useStartCheckout()
  const [coupon, setCoupon] = useState('')

  useEffect(() => {
    if (!open || !plan) return
    setCoupon('')
  }, [open, plan])

  if (!plan) return null

  const handleClose = () => {
    if (checkout.isPending) return
    onClose()
  }

  const handleSubmit = async () => {
    try {
      await checkout.mutateAsync({
        planId: plan.id,
        couponCode: coupon.trim() || undefined,
      })
    } catch {
      // erro já tratado por useApiError no hook.
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <ModalHeader
        title={`Assinar ${plan.name}`}
        subtitle="Assinatura mensal recorrente no cartão"
        onClose={handleClose}
        disabled={checkout.isPending}
      />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <FieldLabel label="Cupom de desconto" />
            <TextField
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              fullWidth
              size="small"
              placeholder="Opcional"
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: 'surface.sunken',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
              R$ {formatPrice(plan.Price)}
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}/mês
              </Typography>
            </Typography>
          </Box>

          {plan.trialDays ? (
            <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600 }}>
              {plan.trialDays} dias grátis — a primeira cobrança ocorre ao fim do teste.
            </Typography>
          ) : null}
        </Box>
      </DialogContent>

      <FormModalActions
        onCancel={handleClose}
        onSubmit={handleSubmit}
        isPending={checkout.isPending}
        submitLabel="Ir para o pagamento"
        pendingLabel="Processando..."
        showRequiredHint={false}
      />
    </Dialog>
  )
}
