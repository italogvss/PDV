import { CheckRounded, DeleteOutlined, LocalOfferRounded, ShoppingCartOutlined } from '@mui/icons-material'
import { Box, Button, Divider, Typography } from '@mui/material'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import { formatBRL } from '../../../../utils/currency'
import CartItem from '../CartItem'
import ServiceCartItem from '../ServiceCartItem'
import PaymentSection from './components/PaymentSection'
import { CartPanelProps } from './types'

export default function CartPanel({
  lines,
  subtotal,
  onIncrement,
  onDecrement,
  onRemove,
  onFinalize,
  onRestart,
  customerMissing,
  discountAmount,
  onDiscountChange,
  allowDiscounts,
  discountLimitPercent,
  method,
  onMethodChange,
  cardType,
  onCardTypeChange,
  installments,
  onInstallmentsChange,
  cashReceived,
  onCashReceivedChange,
  payments,
}: CartPanelProps) {
  const isEmpty = lines.length === 0
  const maxDiscount = allowDiscounts ? (subtotal * discountLimitPercent) / 100 : 0
  const clampedDiscount = Math.min(discountAmount, maxDiscount)
  const discountPercent = subtotal > 0 ? (clampedDiscount / subtotal) * 100 : 0
  const total = Math.max(0, subtotal - clampedDiscount)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        borderRadius: 3,
        border: 1,
        overflow: 'hidden',
        borderColor: 'border.strong',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'border.subtle', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4" color="text.primary" sx={{ pl: 2 }}>
          Carrinho
        </Typography>
        <Button variant="ghost" startIcon={<DeleteOutlined />} onClick={onRestart}>
          Limpar
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 3 }}>
        {isEmpty ? (
          <Box
            sx={{
              height: '100%',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: 'text.tertiary',
            }}
          >
            <ShoppingCartOutlined sx={{ fontSize: 32 }} />
            <Typography variant="body2">Adicione produtos ou serviços para iniciar a venda</Typography>
          </Box>
        ) : (
          lines.map((line) =>
            line.type === 'product' ? (
              <CartItem
                key={line.productId}
                product={line.product}
                quantity={line.quantity}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
              />
            ) : (
              <ServiceCartItem
                key={line.lineId}
                service={line.service}
                lineId={line.lineId}
                onRemove={onRemove}
              />
            ),
          )
        )}
      </Box>

      <Box
        sx={{
          p: 3,
          borderTop: 1,
          borderColor: 'border.strong',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'surface.sunken',
        }}
      >
        {allowDiscounts && (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
            <FieldLabel label={`Limite de desconto ${discountLimitPercent}% (${formatBRL(maxDiscount)})`} />
            <CurrencyField
              value={discountAmount}
              onChange={(value) => onDiscountChange(Math.min(value, maxDiscount))}
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
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.tertiary">
              {lines.length} {lines.length === 1 ? 'item' : 'itens'}
            </Typography>
            <Typography variant="body2" color="text.tertiary">
              {formatBRL(subtotal)}
            </Typography>
          </Box>
          {clampedDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Desconto</Typography>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                -{formatBRL(clampedDiscount)}
              </Typography>
            </Box>
          )}
          <Divider sx={{ borderColor: 'border.strong', borderStyle: 'dashed', }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
              Total
            </Typography>
            <Typography variant="h3" color="text.primary">
              {formatBRL(total)}
            </Typography>
          </Box>
        </Box>

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

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={isEmpty || customerMissing}
          startIcon={<CheckRounded />}
          onClick={onFinalize}
          sx={{ mt: 1 }}
        >
          Finalizar
        </Button>
      </Box>
    </Box>
  )
}
