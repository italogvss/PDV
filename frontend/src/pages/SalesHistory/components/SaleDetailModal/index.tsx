import BlockRounded from '@mui/icons-material/BlockRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import PrintRounded from '@mui/icons-material/PrintRounded'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import CreditStatusChip from '../../../../components/CreditStatusChip'
import SaleReceipt from '../../../../components/SaleReceipt'
import { PAYMENT_METHOD_LABELS } from '../../../../constants/payment'
import { useSaleDetail } from '../../../../hooks/useSales'
import { usePdvSettings } from '../../../../hooks/useTenantSettings'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import { formatBRL } from '../../../../utils/currency'
import { printDocument } from '../../../../utils/print'
import { formatDueDate } from '../../../Credit/types'
import type { SalePaymentMethod } from '../../types'
import { SALE_STATUS_MAP } from '../../types'
import PaymentChip from '../PaymentChip'
import StatusChip from '../StatusChip'
import type { SaleDetailModalProps } from './types'

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
  // Dados da loja para o cabeçalho do comprovante (mesma query já cacheada do PDV).
  const { data: settings } = usePdvSettings()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Eixo de acesso (módulo do tenant), não de plano: quem não tem crediário habilitado
  // não vê a seção nem o atalho para uma tela que não pode abrir.
  const { isModuleEnabled } = useUserPermissions()
  const creditEnabled = isModuleEnabled('credit')

  const status = sale ? (SALE_STATUS_MAP[sale.status] ?? 'Ativo') : null
  const payment = sale ? ((PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod) as SalePaymentMethod) : null

  return (
    <Dialog open={saleId !== null} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
              {sale.cancelledByName && (
                <InfoRow label="Cancelado por">
                  <Typography variant="body2">{sale.cancelledByName}</Typography>
                </InfoRow>
              )}
              {sale.cancelledAt && (
                <InfoRow label="Data do cancelamento">
                  <Typography variant="body2">{formatDateTime(sale.cancelledAt)}</Typography>
                </InfoRow>
              )}
            </Box>

            <Divider />
            <Typography variant="caption" sx={{ pl: 3, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Itens
            </Typography>
            <Paper sx={{ backgroundColor: "surface.sunken", border: 1, borderColor: "border.strong", m: 2 }}>
              <Box sx={{ p: 2 }}>
                <Table size="small">
                  <TableHead sx={{}}>
                    <TableRow >
                      <TableCell align="left" sx={{ pl: 1, color: 'text.tertiary', fontSize: 11 }}>Produto</TableCell>
                      <TableCell align="center" sx={{ color: 'text.tertiary', fontSize: 11 }}>Qtd</TableCell>
                      <TableCell align="center" sx={{ color: 'text.tertiary', fontSize: 11 }}>Unit.</TableCell>
                      <TableCell align="center" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }}>Total</TableCell>
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
            </Paper>
            <Divider />

            <Box sx={{ px: 3, py: 2 }}>
              <InfoRow label="Subtotal">
                <Typography variant="body2">{formatBRL(sale.total + (sale.discount ?? 0))}</Typography>
              </InfoRow>
              {(sale.discount ?? 0) > 0 && (
                <InfoRow label="Desconto">
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                    -{formatBRL(sale.discount)}
                  </Typography>
                </InfoRow>
              )}
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
              {sale.feeAmount > 0 && (
                <>
                  <InfoRow label={`Taxa ${PAYMENT_METHOD_LABELS[sale.paymentMethod]} (${sale.feeRate}%)`}>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                      -{formatBRL(sale.feeAmount)}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Valor líquido recebido">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatBRL(sale.netAmount)}</Typography>
                  </InfoRow>
                </>
              )}
            </Box>

            {/* Situação do crediário em LEITURA — receber, estornar e cobrar são da tela
                de crediário, para onde o botão leva. */}
            {sale.credit && creditEnabled && (
              <>
                <Divider />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    pl: 3,
                    pr: 2,
                    pt: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Crediário
                  </Typography>
                  <CreditStatusChip status={sale.credit.status} isOverdue={sale.credit.isOverdue} />
                </Box>

                <Box sx={{ px: 3, py: 1 }}>
                  {sale.credit.downPayment > 0 && (
                    <InfoRow label="Entrada">
                      <Typography variant="body2">{formatBRL(sale.credit.downPayment)}</Typography>
                    </InfoRow>
                  )}
                  <InfoRow label="Valor financiado">
                    <Typography variant="body2">{formatBRL(sale.credit.totalAmount)}</Typography>
                  </InfoRow>
                  <InfoRow label="Parcelas quitadas">
                    <Typography variant="body2">
                      {sale.credit.paidInstallmentCount}/{sale.credit.installmentCount}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Já recebido">
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                      {formatBRL(sale.credit.paidAmount)}
                    </Typography>
                  </InfoRow>
                  <InfoRow label="Saldo devedor">
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formatBRL(sale.credit.balance)}
                    </Typography>
                  </InfoRow>
                  {sale.credit.nextDueDate && (
                    <InfoRow label="Próximo vencimento">
                      <Typography
                        variant="body2"
                        color={sale.credit.isOverdue ? 'error.main' : 'text.primary'}
                        sx={{ fontWeight: sale.credit.isOverdue ? 600 : 400 }}
                      >
                        {formatDueDate(sale.credit.nextDueDate)}
                      </Typography>
                    </InfoRow>
                  )}
                </Box>

                <Paper sx={{ backgroundColor: 'surface.sunken', border: 1, borderColor: 'border.strong', m: 2 }}>
                  <Box sx={{ p: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ pl: 1, color: 'text.tertiary', fontSize: 11 }}>#</TableCell>
                          <TableCell sx={{ color: 'text.tertiary', fontSize: 11 }}>Vencimento</TableCell>
                          <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Valor</TableCell>
                          <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Saldo</TableCell>
                          <TableCell align="center" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sale.creditInstallments.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell sx={{ pl: 1, border: 0 }}>
                              <Typography variant="body2">{i.number}/{i.ofTotal}</Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0 }}>
                              <Typography variant="body2">{formatDueDate(i.dueDate)}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ border: 0 }}>
                              <Typography variant="body2">{formatBRL(i.amount)}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ border: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatBRL(i.balance)}</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ pr: 0, border: 0 }}>
                              <CreditStatusChip status={i.status} isOverdue={i.isOverdue} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>

                <Box sx={{ px: 3, pb: 2 }}>
                  <Button
                    size="small"
                    variant="soft"
                    endIcon={<OpenInNewRounded fontSize="small" />}
                    onClick={() => navigate(`/crediario?conta=${sale.credit!.id}`)}
                  >
                    Gerenciar no Crediário
                  </Button>
                </Box>
              </>
            )}
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
        {sale && (
          <Button variant="ghost" size="small" startIcon={<PrintRounded />} onClick={printDocument}>
            Imprimir
          </Button>
        )}
        <Button variant="contained" size="small" onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>

      {/* Mesmo comprovante da finalização da venda — só existe dentro do @media print. */}
      {sale && <SaleReceipt sale={sale} business={settings?.business} />}
    </Dialog>
  )
}
