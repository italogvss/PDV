import { Inventory2Outlined } from '@mui/icons-material'
import { Box, Divider, SxProps, Typography } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import { ProductCardProps } from './types'

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const color = product.category?.color ?? 'primary.main'

  const imagesx: SxProps = {
    height: 72,
    borderRadius: 1.5,
    borderEndStartRadius: 0,
    borderEndEndRadius: 0,
    overflow: 'hidden',
    objectFit: 'cover',
    width: '100%',
    bgcolor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.tertiary',
  }
  return (
    <Box
      onClick={() => onAdd(product.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 1,
        borderRadius: 2,
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
      {product.imageUrl ? (
        <Box
          component="img"
          src={product.imageUrl}
          alt={product.name}
          sx={imagesx}
        />
      ) : (
        <Box
          sx={imagesx}
        >
          <Inventory2Outlined sx={{ fontSize: 28 }} />
        </Box>
        
      )}
      
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
