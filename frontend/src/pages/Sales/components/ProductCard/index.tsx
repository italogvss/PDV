import { Box, Typography } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import { ProductCardProps } from './types'

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const hasImage = Boolean(product.imageUrl)

  return (
    <Box
      onClick={() => onAdd(product.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        border: 1,
        padding: 1.5,
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: 'secondary.main',
          boxShadow: (theme) => theme.customShadows.sm,
        },
      }}
    >
      <Box sx={{borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "border.strong"}}>
      {hasImage ? (
        <Box
          component="img"
          src={product.imageUrl}
          alt={product.name}
          sx={{ height: 96, width: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box
          sx={{
            height: 90,
            maxHeight: 90,
            width: '100%',
            background: (theme) =>
              `repeating-linear-gradient(-45deg, ${theme.palette.background.default}, ${theme.palette.background.default} 6px, ${theme.palette.divider} 6px, ${theme.palette.divider} 12px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {product.category?.name && (
            <Typography variant="caption" sx={{ fontWeight: 500, color: "GrayText"}}>
              {product.category.name}
            </Typography>
          )}
        </Box>
      )}
</Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, px: 1, pt: 0.75}}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }} noWrap>
          {product.name}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 'auto',
            pt: 5,
          }}
        >
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
            {formatBRL(product.price)}
          </Typography>
          <Typography variant="caption" color="text.tertiary">
            {product.stock} un.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
