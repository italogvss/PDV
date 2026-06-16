import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { formatBRL } from '../../../utils/currency'
import type { SaleListItem } from '../../../types/sale.types'

export interface RecentSalesTableProps {
  sales: SaleListItem[]
  loading?: boolean
  onViewAll: () => void
}

const PAYMENT_META: Record<string, { label: string; icon: SvgIconComponent }> = {
  PIX: { label: 'Pix', icon: QrCode2Outlined },
  Cash: { label: 'Dinheiro', icon: PaymentsOutlined },
  CreditCard: { label: 'Crédito', icon: CreditCardOutlined },
  DebitCard: { label: 'Débito', icon: CreditCardOutlined },
}

const HEAD_CELL_SX = {
  fontSize: 11,
  fontWeight: 500,
  color: 'text.tertiary',
  textTransform: 'uppercase',
} as const

export default function RecentSalesTable({ sales, loading = false, onViewAll }: RecentSalesTableProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Últimas vendas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sales.length} vendas hoje
            </Typography>
          </Box>
          <Button variant="outlined" size="small" endIcon={<ArrowForwardRounded />} onClick={onViewAll}>
            Ver todas
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Skeleton variant="rounded" height={240} />
          </Box>
        ) : sales.length === 0 ? (
          <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma venda registrada hoje.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'surface.sunken' }}>
                  <TableCell sx={HEAD_CELL_SX}>Cliente</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Pagamento</TableCell>
                  <TableCell align="right" sx={HEAD_CELL_SX}>
                    Total
                  </TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => {
                  const meta = PAYMENT_META[sale.paymentMethod]
                  const PaymentIcon = meta?.icon
                  const cancelled = sale.status === 'Cancelled'
                  return (
                    <TableRow
                      key={sale.id}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'border.subtle',
                        '&:hover': { backgroundColor: 'surface.sunken' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {sale.customerName ?? 'Cliente avulso'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                          {PaymentIcon && <PaymentIcon sx={{ fontSize: 16 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {meta?.label ?? sale.paymentMethod}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatBRL(sale.total)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={cancelled ? 'error' : 'success'}
                          label={cancelled ? 'Cancelado' : 'Pago'}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  )
}
