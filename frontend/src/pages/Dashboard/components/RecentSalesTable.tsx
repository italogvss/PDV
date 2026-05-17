import { Card, CardContent, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { Sale } from '../../../types/dashboard.types'
import { formatBRL } from '../../../utils/currency'

interface RecentSalesTableProps {
  sales: Sale[]
}

export default function RecentSalesTable({ sales }: RecentSalesTableProps) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Últimas vendas
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'surface.sunken' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Data
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Cliente
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Pagamento
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 500, color: 'text.tertiary', textTransform: 'uppercase' }}>
                  Valor
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map((sale) => (
                <TableRow
                  key={sale.id}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'border.subtle',
                    '&:hover': { backgroundColor: 'surface.sunken' },
                  }}
                >
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {sale.date}
                    </Typography>
                    <Typography variant="caption" color="text.tertiary">
                      {sale.time}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {sale.customer}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {sale.paymentMethod}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatBRL(sale.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
