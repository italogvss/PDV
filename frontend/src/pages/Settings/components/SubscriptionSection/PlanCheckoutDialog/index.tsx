import { useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, TextField, Typography } from '@mui/material'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined'
import ModalHeader from '../../../../../components/ModalHeader'
import FieldLabel from '../../../../../components/FieldLabel'
import FormModalActions from '../../../../../components/FormModalActions'
import { useStartCheckout } from '../../../../../hooks/useSubscription'
import type { BillingPeriod, PaymentMethod } from '../../../../../types/subscription.types'
import { formatPrice } from '../helpers'
import type { PlanCheckoutDialogProps } from './types'

// Pílula selecionável (escura quando ativa) — padrão de chips de seleção do tema.
function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        flex: 1,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        border: 2,
        borderColor: active ? 'text.primary' : 'border.subtle',
        bgcolor: active ? 'text.primary' : 'background.paper',
        color: active ? 'background.paper' : disabled ? 'text.disabled' : 'text.primary',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        fontWeight: 600,
        fontSize: 14,
        transition: 'all 0.12s',
      }}
    >
      {children}
    </Box>
  )
}

export default function PlanCheckoutDialog({ open, plan, onClose, onPixGenerated }: PlanCheckoutDialogProps) {
  const checkout = useStartCheckout()
  const [method, setMethod] = useState<PaymentMethod>('Card')
  const [period, setPeriod] = useState<BillingPeriod>('Monthly')
  const [coupon, setCoupon] = useState('')

  useEffect(() => {
    if (!open || !plan) return
    setMethod(plan.supportsCard ? 'Card' : 'Pix')
    setPeriod('Monthly')
    setCoupon('')
  }, [open, plan])

  if (!plan) return null

  const isPix = method === 'Pix'
  const annualAvailable = plan.priceAnnual !== null
  const amount = isPix && period === 'Annual' && plan.priceAnnual !== null ? plan.priceAnnual : plan.priceMonthly
  const periodLabel = !isPix ? '/mês' : period === 'Annual' ? ' (12 meses)' : ' (1 mês)'

  const handleClose = () => {
    if (checkout.isPending) return
    onClose()
  }

  const handleSubmit = async () => {
    try {
      const result = await checkout.mutateAsync({
        planId: plan.id,
        method,
        period: isPix ? period : undefined,
        couponCode: coupon.trim() || undefined,
      })
      // Cartão → o hook redireciona. PIX → devolve o QR para o pai.
      if (result.pix) {
        onPixGenerated(result.pix)
        onClose()
      }
    } catch {
      // erro já tratado por useApiError no hook.
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <ModalHeader
        title={`Assinar ${plan.name}`}
        subtitle="Escolha a forma de pagamento"
        onClose={handleClose}
        disabled={checkout.isPending}
      />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box>
            <FieldLabel label="Forma de pagamento" />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Pill active={method === 'Card'} disabled={!plan.supportsCard} onClick={() => setMethod('Card')}>
                <CreditCardOutlined sx={{ fontSize: 18 }} /> Cartão
              </Pill>
              <Pill active={method === 'Pix'} disabled={!plan.supportsPix} onClick={() => setMethod('Pix')}>
                <QrCode2Outlined sx={{ fontSize: 18 }} /> PIX
              </Pill>
            </Box>
            <Typography variant="caption" color="text.tertiary" sx={{ mt: 0.75, display: 'block' }}>
              {isPix
                ? 'Pagamento único — não renova automaticamente.'
                : 'Assinatura mensal recorrente no cartão.'}
            </Typography>
          </Box>

          {isPix && (
            <Box>
              <FieldLabel label="Período" />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Pill active={period === 'Monthly'} onClick={() => setPeriod('Monthly')}>
                  Mensal
                </Pill>
                <Pill active={period === 'Annual'} disabled={!annualAvailable} onClick={() => setPeriod('Annual')}>
                  Anual
                </Pill>
              </Box>
            </Box>
          )}

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
              R$ {formatPrice(amount)}
              <Typography component="span" variant="caption" color="text.secondary">
                {periodLabel}
              </Typography>
            </Typography>
          </Box>

          {!isPix && plan.trialDays ? (
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
        submitLabel={isPix ? 'Gerar PIX' : 'Ir para o pagamento'}
        pendingLabel="Processando..."
        showRequiredHint={false}
      />
    </Dialog>
  )
}
