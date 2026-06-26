import {
  CloseRounded,
  LocalOfferRounded,
  PersonAddAlt1Rounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import { formatBRL } from '../../../../utils/currency'
import { maskCPF } from '../../../../utils/masks'
import PaymentSection from '../CartPanel/components/PaymentSection'
import type { FinalizationModalProps } from './types'


export default function FinalizationModal({
  open,
  onClose,
  lines,
  subtotal,
  discountAmount,
  onDiscountChange,
  allowDiscounts,
  discountLimitPercent,
  customer,
  onCustomerChange,
  onOpenCustomerModal,
  method,
  onMethodChange,
  cardType,
  onCardTypeChange,
  installments,
  onInstallmentsChange,
  cashReceived,
  onCashReceivedChange,
  payments,
  onFinalize,
  isSubmitting,
}: FinalizationModalProps) {
  // Teto do desconto: limitado ao percentual configurado no tenant (0% = sem desconto permitido).
  const maxDiscount = allowDiscounts ? (subtotal * discountLimitPercent) / 100 : 0
  const clampedDiscount = Math.min(discountAmount, maxDiscount)
  const total = Math.max(0, subtotal - clampedDiscount)
  const discountPercent = subtotal > 0 ? (clampedDiscount / subtotal) * 100 : 0
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title="Finalizar venda"
        subtitle="Revise os itens e confirme o pagamento"
        onClose={onClose}
        disabled={isSubmitting}
      />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, color: "text.secondary" }}>
          <Box sx={{ backgroundColor: "surface.sunken", border: "1px solid", borderColor: "border.strong", px: 2, py: 2, borderRadius: 2}}>
            {/* Resumo dos itens */}
            <Box sx={{mb: 2}} >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Itens
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 250, overflowY: 'auto' }}>
                {lines.map((line) => {
                  const name = line.type === 'product' ? line.product.name : line.service.name
                  const price = line.type === 'product' ? line.product.price : line.service.price
                  const qty = line.quantity
                  return (
                    <Box
                      key={line.type === 'product' ? line.productId : line.lineId}
                      sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}
                    >
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 2 }}>
                        {qty}× {name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                        {formatBRL(price * qty)}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {allowDiscounts && (
              <>
                {/* Desconto */}
                <Box>
                  <FieldLabel label={`Desconto: Limite de ${discountLimitPercent}% (${formatBRL(maxDiscount)})`} />
                  <CurrencyField
                    value={discountAmount}
                    onChange={(value) => onDiscountChange(Math.min(value, maxDiscount))}
                    fullWidth
                    size="small"
                    placeholder="0,00"
                  />
                  {clampedDiscount > 0 && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 2,
                        py: 0.75,
                        mt: 1,
                        borderRadius: '10px',
                        bgcolor: 'warning.soft',
                      }}
                    >
                      <LocalOfferRounded sx={{ fontSize: 13, color: 'warning.main' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.ink' }}>
                        Desconto -{discountPercent.toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {/* Resumo financeiro */}
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
              <Divider sx={{ my: 0.5, borderColor: 'border.strong', borderStyle: "dashed" }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "text.primary"}}>Total</Typography>
                <Typography variant="h3" sx={{color: "text.primary"}}>{formatBRL(total)}</Typography>
              </Box>
            </Box>
          </Box>
          <Divider sx={{ borderColor: 'border.subtle' }} />

          {/* Cliente */}
          {customer.type === 'entity' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                border: 1,
                borderColor: 'border.subtle',
                bgcolor: 'background.default',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, ml: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                  {customer.name}
                </Typography>
                {customer.document && (
                  <Typography variant="caption" color="text.secondary">
                    {customer.document}
                  </Typography>
                )}
              </Box>
              <IconButton
                size="small"
                onClick={() => onCustomerChange({ type: 'none' })}
                sx={{ bgcolor: 'error.soft', color: 'error.ink', borderRadius: 999, '&:hover': { bgcolor: 'error.main', color: 'common.white' } }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="CPF (opcional)"
                value={customer.type === 'cpf' ? customer.document : ''}
                onChange={(e) => {
                  const val = maskCPF(e.target.value)
                  onCustomerChange(val ? { type: 'cpf', document: val } : { type: 'none' })
                }}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAddAlt1Rounded />}
                onClick={onOpenCustomerModal}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Adicionar cliente
              </Button>
            </Box>
          )}

          {/* Pagamento */}
          <PaymentSection
            method={method}
            onMethodChange={onMethodChange}
            cardType={cardType}
            onCardTypeChange={onCardTypeChange}
            installments={installments}
            onInstallmentsChange={onInstallmentsChange}
            total={total}
            cashReceived={cashReceived}
            onCashReceivedChange={onCashReceivedChange}
            payments={payments}
          />

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
