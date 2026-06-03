import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import BlockRounded from '@mui/icons-material/BlockRounded'
import { useSaleDetail } from '../../../../hooks/useSales'
import { formatBRL } from '../../../../utils/currency'
import StatusChip from '../StatusChip'
import PaymentChip from '../PaymentChip'
import type { SaleDetailModalProps } from './types'
import type { SaleStatus, SalePaymentMethod } from '../../types'

const STATUS_MAP: Record<string, SaleStatus> = {
  Active: 'Ativo',
  Cancelled: 'Cancelado',
}

const PAYMENT_MAP: Record<string, SalePaymentMethod> = {
  Cash: 'Dinheiro',
  PIX: 'Pix',
  CreditCard: 'Crédito',
  DebitCard: 'Débito',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right' }}>{children}</Box>
    </Box>
  )
}

export default function SaleDetailModal({ saleId, onClose, onCancel }: SaleDetailModalProps) {
  const { data: sale, isLoading } = useSaleDetail(saleId)

  const status = sale ? (STATUS_MAP[sale.status] ?? 'Ativo') : null
  const payment = sale ? (PAYMENT_MAP[sale.paymentMethod] ?? (sale.paymentMethod as SalePaymentMethod)) : null

  return (
    <Dialog
      open={saleId !== null}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Detalhes da venda
          </Typography>
          {sale && (
            <Typography variant="caption" color="text.tertiary">
              {sale.id.slice(0, 8).toUpperCase()}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.tertiary' }}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {sale && (
          <>
            <Box sx={{ px: 3, py: 2 }}>
              <InfoRow label="Data / hora">
                <Typography variant="body2">{formatDateTime(sale.createdAt)}</Typography>
              </InfoRow>
              <InfoRow label="Operador">
                <Typography variant="body2">{sale.operatorName}</Typography>
              </InfoRow>
              {sale.customerName && (
                <InfoRow label="Cliente">
                  <Typography variant="body2">{sale.customerName}</Typography>
                </InfoRow>
              )}
              <InfoRow label="Pagamento">
                {payment && <PaymentChip method={payment} />}
              </InfoRow>
              {sale.isInstallment && sale.installmentCount && (
                <InfoRow label="Parcelamento">
                  <Typography variant="body2">
                    {sale.installmentCount}x de {sale.installmentValue != null ? formatBRL(sale.installmentValue) : '—'}
                  </Typography>
                </InfoRow>
              )}
              <InfoRow label="Status">
                {status && <StatusChip status={status} />}
              </InfoRow>
            </Box>

            <Divider />

            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Itens
              </Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ pl: 0, color: 'text.tertiary', fontSize: 11 }}>Produto</TableCell>
                    <TableCell align="center" sx={{ color: 'text.tertiary', fontSize: 11 }}>Qtd</TableCell>
                    <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Unit.</TableCell>
                    <TableCell align="right" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ pl: 0, border: 0 }}>
                        <Typography variant="body2">{item.productName}</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ border: 0 }}>
                        <Typography variant="body2">{item.quantity}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 0 }}>
                        <Typography variant="body2">{formatBRL(item.unitPrice)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 0, border: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatBRL(item.subtotal)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Divider />

            <Box sx={{ px: 3, py: 2 }}>
              <InfoRow label="Subtotal">
                <Typography variant="body2">{formatBRL(sale.total)}</Typography>
              </InfoRow>
              <InfoRow label="Valor pago">
                <Typography variant="body2">{formatBRL(sale.amountPaid)}</Typography>
              </InfoRow>
              {sale.change > 0 && (
                <InfoRow label="Troco">
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    {formatBRL(sale.change)}
                  </Typography>
                </InfoRow>
              )}
              <InfoRow label="Total">
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatBRL(sale.total)}</Typography>
              </InfoRow>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {sale && status !== 'Cancelado' && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<BlockRounded />}
            onClick={() => { onCancel(sale.id); onClose() }}
          >
            Cancelar venda
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
