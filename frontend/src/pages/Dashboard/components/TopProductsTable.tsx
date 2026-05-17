import { Card, CardContent, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import { TopProduct } from '../../../types/dashboard.types'
import { formatBRL } from '../../../utils/currency'

interface TopProductsTableProps {
  products: TopProduct[]
}

const CHIP_ICON_SX = {
  '& .MuiChip-icon': {
    fontSize: '12px !important',
    color: 'inherit',
    ml: 0.75,
    mr: '-3px',
  },
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Produtos mais vendidos
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'surface.sunken' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Produto
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Vendas
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Receita
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Tendência
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const isPositive = product.trend >= 0
                return (
                  <TableRow
                    key={product.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'border.subtle',
                      '&:hover': { backgroundColor: 'surface.sunken' },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {product.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {product.sold} un.
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatBRL(product.revenue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        color={isPositive ? 'success' : 'error'}
                        icon={isPositive ? <TrendingUpRounded /> : <TrendingDownRounded />}
                        label={`${isPositive ? '+' : ''}${product.trend}%`}
                        sx={CHIP_ICON_SX}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
