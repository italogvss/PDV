import { Box, Typography } from '@mui/material'
import { Inventory2Outlined } from '@mui/icons-material'
import { formatBRL } from '../../../../utils/currency'
import { ProductCardProps } from './types'

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const color = product.category?.color ?? '#9e9e9e'

  return (
    <Box
      onClick={() => onAdd(product.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          borderColor: 'border.strong',
          boxShadow: (theme) => theme.customShadows.sm,
        },
      }}
    >
      <Box
        sx={{
          height: 72,
          borderRadius: 2,
          bgcolor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <Inventory2Outlined sx={{ fontSize: 28 }} />
      </Box>
      <Box sx={{ pl: 1 }}>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontWeight: 500, mb: 0.5 }}
          noWrap
        >
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.tertiary" sx={{ fontWeight: 600 }}>
          {formatBRL(product.price)}
        </Typography>
      </Box>
    </Box>
  )
}
