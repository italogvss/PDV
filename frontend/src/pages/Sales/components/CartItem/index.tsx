import { Box, IconButton, Typography } from '@mui/material'
import { AddRounded, RemoveRounded, CloseRounded } from '@mui/icons-material'
import { formatBRL } from '../../../../utils/currency'
import { CartItemProps } from './types'

export default function CartItem({
  product,
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) {
  const lineTotal = product.price * quantity
  const atMaxStock = quantity >= product.stock

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        py: 2,
        borderBottom: 1,
        borderColor: 'border.subtle',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {product.name}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onRemove(product.id)}
          sx={{ p: 0.5, color: 'text.tertiary', '&:hover': { color: 'error.main' } }}
        >
          <CloseRounded sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            border: 1,
            borderColor: atMaxStock ? 'warning.main' : 'border.subtle',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <IconButton
            size="small"
            onClick={() => onDecrement(product.id)}
            sx={{ p: 0.5, color: 'text.secondary' }}
          >
            <RemoveRounded sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="body2"
            sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600, color: 'text.primary' }}
          >
            {quantity}
          </Typography>
          <IconButton
            size="small"
            disabled={atMaxStock}
            onClick={() => onIncrement(product.id)}
            sx={{ p: 0.5, color: 'text.secondary' }}
          >
            <AddRounded sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
            {formatBRL(lineTotal)}
          </Typography>
          {atMaxStock && (
            <Typography variant="caption" color="warning.main">
              Limite do estoque
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
