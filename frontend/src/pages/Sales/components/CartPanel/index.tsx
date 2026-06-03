import { Box, Button, CircularProgress, Divider, IconButton, TextField, Typography } from '@mui/material'
import { CheckRounded, CloseRounded, PersonAddAlt1Rounded, ShoppingCartOutlined } from '@mui/icons-material'
import CartItem from '../CartItem'
import ServiceCartItem from '../ServiceCartItem'
import PaymentSection from './components/PaymentSection'
import { formatBRL } from '../../../../utils/currency'
import { CartPanelProps } from './types'

function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export default function CartPanel({
  lines,
  subtotal,
  total,
  method,
  onMethodChange,
  cardType,
  onCardTypeChange,
  installments,
  onInstallmentsChange,
  cashReceived,
  onCashReceivedChange,
  onIncrement,
  onDecrement,
  onRemove,
  onFinalize,
  isSubmitting,
  customer,
  onCustomerChange,
  onOpenCustomerModal,
}: CartPanelProps) {
  const isEmpty = lines.length === 0

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        borderRadius: 3,
        border: 1,
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'border.subtle' }}>
        <Typography variant="h4" color="text.primary">
          Venda atual
        </Typography>
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
          borderColor: 'border.subtle',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.tertiary">
            {lines.length} {lines.length === 1 ? 'item' : 'itens'}
          </Typography>
          <Typography variant="body2" color="text.tertiary">
            {formatBRL(subtotal)}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'border.subtle' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
            Total
          </Typography>
          <Typography variant="h3" color="text.primary">
            {formatBRL(total)}
          </Typography>
        </Box>

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
        />

        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          disabled={isEmpty || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />}
          onClick={onFinalize}
          sx={{ mt: 1 }}
        >
          {isSubmitting ? 'Registrando...' : 'Finalizar venda'}
        </Button>
      </Box>
    </Box>
  )
}
