import BlockRounded from '@mui/icons-material/BlockRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import UndoRounded from '@mui/icons-material/UndoRounded'
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { PAYMENT_METHOD_LABELS } from '../../../../constants/payment'
import { useCreditAccount } from '../../../../hooks/useCredit'
import { formatBRL } from '../../../../utils/currency'
import { formatDateTime, formatDueDate } from '../../types'
import CreditStatusChip from '../CreditStatusChip'
import type { Props } from './types'

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        pl: 3,
        fontWeight: 600,
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </Typography>
  )
}

export default function CreditDetailModal({
  accountId,
  onClose,
  onReceive,
  onReverse,
  onCancelAccount,
  canManage,
  canCancel,
}: Props) {
  const { data, isLoading } = useCreditAccount(accountId)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const account = data?.account
  const sale = data?.sale

  return (
    <Dialog open={accountId !== null} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Detalhes do crediário
          </Typography>
          {account && (
            <Typography variant="caption" color="text.tertiary">
              {account.customerName} · venda {account.saleId.slice(0, 8).toUpperCase()}
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

        {account && (
          <>
            <Box sx={{ px: 3, py: 2 }}>
              <InfoRow label="Cliente">
                <Typography variant="body2">{account.customerName}</Typography>
              </InfoRow>
              <InfoRow label="Aberto em">
                <Typography variant="body2">{formatDateTime(account.createdAt)}</Typography>
              </InfoRow>
              <InfoRow label="Status">
                <CreditStatusChip status={account.status} isOverdue={account.isOverdue} />
              </InfoRow>
              {account.downPayment > 0 && (
                <InfoRow label="Entrada">
                  <Typography variant="body2">{formatBRL(account.downPayment)}</Typography>
                </InfoRow>
              )}
              <InfoRow label="Valor financiado">
                <Typography variant="body2">{formatBRL(account.totalAmount)}</Typography>
              </InfoRow>
              <InfoRow label="Já recebido">
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  {formatBRL(account.paidAmount)}
                </Typography>
              </InfoRow>
              <InfoRow label="Saldo devedor">
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {formatBRL(account.balance)}
                </Typography>
              </InfoRow>
              {account.note && (
                <InfoRow label="Observação">
                  <Typography variant="body2">{account.note}</Typography>
                </InfoRow>
              )}
            </Box>

            <Divider />
            <SectionLabel>Parcelas</SectionLabel>
            <Paper
              sx={{ backgroundColor: 'surface.sunken', border: 1, borderColor: 'border.strong', m: 2 }}
            >
              <Box sx={{ p: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ pl: 1, color: 'text.tertiary', fontSize: 11 }}>#</TableCell>
                      <TableCell sx={{ color: 'text.tertiary', fontSize: 11 }}>Vencimento</TableCell>
                      <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Valor</TableCell>
                      <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Pago</TableCell>
                      <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Saldo</TableCell>
                      <TableCell align="center" sx={{ color: 'text.tertiary', fontSize: 11 }}>Status</TableCell>
                      <TableCell align="right" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.installments.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell sx={{ pl: 1, border: 0 }}>
                          <Typography variant="body2">
                            {i.number}/{i.ofTotal}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ border: 0 }}>
                          <Typography variant="body2">{formatDueDate(i.dueDate)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          <Typography variant="body2">{formatBRL(i.amount)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          <Typography variant="body2">{formatBRL(i.paidAmount)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatBRL(i.balance)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ border: 0 }}>
                          <CreditStatusChip status={i.status} isOverdue={i.isOverdue} />
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 0, border: 0 }}>
                          {canManage && i.status === 'Open' && (
                            <Button size="small" variant="soft" onClick={() => onReceive(i)}>
                              Receber
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>

            {data && data.payments.length > 0 && (
              <>
                <Divider />
                <SectionLabel>Recebimentos</SectionLabel>
                <Paper
                  sx={{ backgroundColor: 'surface.sunken', border: 1, borderColor: 'border.strong', m: 2 }}
                >
                  <Box sx={{ p: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ pl: 1, color: 'text.tertiary', fontSize: 11 }}>Data</TableCell>
                          <TableCell sx={{ color: 'text.tertiary', fontSize: 11 }}>Parcela</TableCell>
                          <TableCell sx={{ color: 'text.tertiary', fontSize: 11 }}>Forma</TableCell>
                          <TableCell sx={{ color: 'text.tertiary', fontSize: 11 }}>Operador</TableCell>
                          <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Valor</TableCell>
                          <TableCell align="right" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell sx={{ pl: 1, border: 0 }}>
                              <Typography variant="body2">{formatDateTime(p.receivedAt)}</Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0 }}>
                              <Typography variant="body2">{p.installmentNumber}</Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0 }}>
                              <Typography variant="body2">
                                {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0 }}>
                              <Typography variant="body2">{p.operatorName}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ border: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatBRL(p.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ pr: 0, border: 0 }}>
                              {canCancel && (
                                <Tooltip title="Estornar recebimento">
                                  <IconButton size="small" onClick={() => onReverse(p.id)}>
                                    <UndoRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </>
            )}

            {sale && (
              <>
                <Divider />
                <SectionLabel>Itens da venda</SectionLabel>
                <Paper
                  sx={{ backgroundColor: 'surface.sunken', border: 1, borderColor: 'border.strong', m: 2 }}
                >
                  <Box sx={{ p: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ pl: 1, color: 'text.tertiary', fontSize: 11 }}>Produto</TableCell>
                          <TableCell align="center" sx={{ color: 'text.tertiary', fontSize: 11 }}>Qtd</TableCell>
                          <TableCell align="right" sx={{ color: 'text.tertiary', fontSize: 11 }}>Unit.</TableCell>
                          <TableCell align="right" sx={{ pr: 0, color: 'text.tertiary', fontSize: 11 }}>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sale.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ pl: 1, border: 0 }}>
                              <Typography variant="body2">{item.productName}</Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ border: 0 }}>
                              <Typography variant="body2">{item.quantity}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ border: 0 }}>
                              <Typography variant="body2">{formatBRL(item.unitPrice)}</Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ pr: 0, border: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatBRL(item.subtotal)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>

                <Box sx={{ px: 3, pb: 2 }}>
                  {sale.discount > 0 && (
                    <InfoRow label="Desconto">
                      <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                        -{formatBRL(sale.discount)}
                      </Typography>
                    </InfoRow>
                  )}
                  <InfoRow label="Total da venda">
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formatBRL(sale.total)}
                    </Typography>
                  </InfoRow>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {account && canCancel && account.status === 'Open' && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<BlockRounded />}
            onClick={() => onCancelAccount(account.id)}
          >
            Cancelar crediário
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
