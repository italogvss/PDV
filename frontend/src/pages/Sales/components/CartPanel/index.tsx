import { Box, Button, Divider, Typography } from '@mui/material'
import { CheckRounded, ShoppingCartOutlined } from '@mui/icons-material'
import CartItem from '../CartItem'
import PaymentSection from './components/PaymentSection'
import { formatBRL } from '../../../../utils/currency'
import { CartPanelProps } from './types'

export default function CartPanel({
  lines,
  subtotal,
  discount,
  total,
  method,
  onMethodChange,
  cashReceived,
  onCashReceivedChange,
  onIncrement,
  onDecrement,
  onRemove,
  onFinalize,
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
            <Typography variant="body2">Adicione produtos para iniciar a venda</Typography>
          </Box>
        ) : (
          lines.map((line) => (
            <CartItem
              key={line.productId}
              product={line.product}
              quantity={line.quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          ))
        )}
      </Box>

      <Box sx={{ p: 3, borderTop: 1, borderColor: 'border.subtle', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.tertiary">Subtotal</Typography>
          <Typography variant="body2" color="text.primary">{formatBRL(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.tertiary">Desconto</Typography>
          <Typography variant="body2" color="error.main">- {formatBRL(discount)}</Typography>
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

        <PaymentSection
          method={method}
          onMethodChange={onMethodChange}
          total={total}
          cashReceived={cashReceived}
          onCashReceivedChange={onCashReceivedChange}
        />

        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          disabled={isEmpty}
          startIcon={<CheckRounded />}
          onClick={onFinalize}
          sx={{ mt: 1 }}
        >
          Finalizar venda
        </Button>
      </Box>
    </Box>
  )
}
