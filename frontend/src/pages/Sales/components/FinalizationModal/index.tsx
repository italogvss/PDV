import {
  Box,
  Dialog,
  DialogContent,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import { formatBRL } from '../../../../utils/currency'
import type { CardType, PaymentMethod } from '../../types'
import type { FinalizationModalProps } from './types'

function paymentLabel(method: PaymentMethod, cardType: CardType, installments: number): string {
  if (method === 'pix') return 'PIX'
  if (method === 'cash') return 'Dinheiro'
  if (cardType === 'debit') return 'Cartão de Débito'
  if (installments > 1) return `Crédito ${installments}x`
  return 'Cartão de Crédito'
}

export default function FinalizationModal({
  open,
  onClose,
  lines,
  subtotal,
  discountAmount,
  customer,
  method,
  cardType,
  installments,
  onFinalize,
  isSubmitting,
}: FinalizationModalProps) {
  const clampedDiscount = Math.min(discountAmount, subtotal)
  const total = Math.max(0, subtotal - clampedDiscount)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title="Confirmar venda"
        subtitle="Revise o resumo antes de concluir"
        onClose={onClose}
        disabled={isSubmitting}
      />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              backgroundColor: 'surface.sunken',
              border: '1px solid',
              borderColor: 'border.strong',
              px: 2,
              py: 2,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Itens
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
              {lines.map((line) => {
                const name = line.type === 'product' ? line.product.name : line.service.name
                const price = line.type === 'product' ? line.product.price : line.service.price
                return (
                  <Box
                    key={line.type === 'product' ? line.productId : line.lineId}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}
                  >
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 2 }}>
                      {line.quantity}× {name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                      {formatBRL(price * line.quantity)}
                    </Typography>
                  </Box>
                )
              })}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">{formatBRL(subtotal)}</Typography>
              </Box>
              {clampedDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Desconto</Typography>
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                    -{formatBRL(clampedDiscount)}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 0.5, borderColor: 'border.strong', borderStyle: 'dashed' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Total</Typography>
                <Typography variant="h3" sx={{ color: 'text.primary' }}>{formatBRL(total)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {customer.type !== 'none' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Cliente</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {customer.type === 'entity' ? customer.name : customer.document}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Pagamento</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {paymentLabel(method, cardType, installments)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        onCancel={onClose}
        onSubmit={onFinalize}
        isPending={isSubmitting}
        submitLabel="Concluir venda"
        submitDisabled={isSubmitting}
      />
    </Dialog>
  )
}
