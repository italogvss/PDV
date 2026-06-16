import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material'
import { formatBRL } from '../../../utils/currency'
import type { TopProduct } from '../../../types/report.types'

export interface TopProductsRankingProps {
  products: TopProduct[]
  loading?: boolean
}

export default function TopProductsRanking({ products, loading = false }: TopProductsRankingProps) {
  const maxRevenue = products.reduce((max, p) => Math.max(max, p.revenue), 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Produtos mais vendidos
          </Typography>
          <Typography variant="caption" color="text.tertiary">
            Este mês
          </Typography>
        </Box>

        {loading ? (
          <Skeleton variant="rounded" height={240} />
        ) : products.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma venda neste mês.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {products.map((product, index) => {
              const share = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0
              return (
                <Box key={product.productName} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.tertiary" sx={{ fontWeight: 600, width: 18 }}>
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
                      {product.productName}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatBRL(product.revenue)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'surface.raised',
                      overflow: 'hidden',
                      ml: '26px',
                    }}
                  >
                    <Box sx={{ height: '100%', width: `${share}%`, bgcolor: 'success.main', borderRadius: 3 }} />
                  </Box>
                  <Typography variant="caption" color="text.tertiary" sx={{ ml: '26px' }}>
                    {product.quantity} unidades vendidas
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
