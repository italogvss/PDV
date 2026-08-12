import { Box, GlobalStyles, Typography } from '@mui/material'
import { createPortal } from 'react-dom'
import { PAYMENT_METHOD_LABELS } from '../../constants/payment'
import { formatBRL } from '../../utils/currency'
import type { SaleReceiptProps } from './types'

export const RECEIPT_ROOT_ID = 'sale-receipt-print'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// Vencimento é data pura no backend — formatar em UTC evita o "voltou um dia" do fuso local.
function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  })
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return value
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2 }}>
      <Typography variant="body2" sx={{ fontSize: 12 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: strong ? 700 : 500 }}>{value}</Typography>
    </Box>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mt: 2, mb: 0.5 }}
    >
      {children}
    </Typography>
  )
}

/**
 * Comprovante imprimível da venda — o MESMO componente serve a finalização da venda e o
 * detalhe do histórico, para que o papel nunca divirja entre os dois caminhos.
 *
 * Fica montado e oculto; só existe visualmente dentro de `@media print`, onde esconde o resto
 * da aplicação. Sem biblioteca de PDF: o "Salvar como PDF" é do próprio diálogo do sistema.
 */
export default function SaleReceipt({ sale, business }: SaleReceiptProps) {
  const subtotal = sale.total + (sale.discount ?? 0)
  const addressLine = business
    ? [
        [business.address.street, business.address.number].filter(Boolean).join(', '),
        business.address.neighborhood,
        [business.address.city, business.address.state].filter(Boolean).join(' - '),
      ].filter(Boolean).join(' · ')
    : ''

  return createPortal(
    <>
      <GlobalStyles
        styles={(theme) => ({
          [`#${RECEIPT_ROOT_ID}`]: { display: 'none' },
          '@media print': {
            // Some tudo que não é o comprovante — inclusive as modais, que o MUI monta
            // como filhas diretas do body.
            [`body > *:not(#${RECEIPT_ROOT_ID})`]: { display: 'none !important' },
            [`#${RECEIPT_ROOT_ID}`]: {
              display: 'block !important',
              position: 'static',
              width: '100%',
              padding: 0,
              margin: 0,
              // Papel é sempre claro: o tema escuro não pode vazar para a impressão.
              background: theme.palette.common.white,
              color: theme.palette.common.black,
            },
            '@page': { margin: '12mm' },
          },
        })}
      />

      <Box id={RECEIPT_ROOT_ID}>
        <Box sx={{ color: 'common.black', bgcolor: 'common.white', fontSize: 12 }}>
          {/* Cabeçalho da loja */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1.5 }}>
            {business?.logoUrl && (
              <Box
                component="img"
                src={business.logoUrl}
                alt=""
                sx={{ width: 56, height: 56, objectFit: 'contain' }}
              />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                {business?.fantasyName || 'Comprovante de venda'}
              </Typography>
              {business?.companyName && (
                <Typography sx={{ fontSize: 11 }}>{business.companyName}</Typography>
              )}
              <Typography sx={{ fontSize: 11 }}>
                {[
                  business?.cnpj ? `CNPJ ${formatCnpj(business.cnpj)}` : null,
                  business?.phone || null,
                ].filter(Boolean).join(' · ')}
              </Typography>
              {addressLine && <Typography sx={{ fontSize: 11 }}>{addressLine}</Typography>}
            </Box>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'common.black' }} />

          <SectionTitle>Comprovante de venda</SectionTitle>
          <Row label="Nº da venda" value={sale.id.slice(0, 8).toUpperCase()} />
          <Row label="Data / hora" value={formatDateTime(sale.createdAt)} />
          <Row label="Operador" value={sale.operatorName} />
          {sale.customerName && <Row label="Cliente" value={sale.customerName} />}
          {sale.customerDocument && <Row label="Documento" value={sale.customerDocument} />}

          <SectionTitle>Itens</SectionTitle>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { borderBottom: '1px solid', borderColor: 'common.black', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', py: 0.5 } }}>
                <Box component="th" sx={{ textAlign: 'left' }}>Item</Box>
                <Box component="th" sx={{ textAlign: 'center', width: 48 }}>Qtd</Box>
                <Box component="th" sx={{ textAlign: 'right', width: 88 }}>Unit.</Box>
                <Box component="th" sx={{ textAlign: 'right', width: 88 }}>Total</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {sale.items.map((item) => (
                <Box component="tr" key={item.id} sx={{ '& td': { py: 0.4, verticalAlign: 'top' } }}>
                  <Box component="td">{item.productName}</Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>{item.quantity}</Box>
                  <Box component="td" sx={{ textAlign: 'right' }}>{formatBRL(item.unitPrice)}</Box>
                  <Box component="td" sx={{ textAlign: 'right', fontWeight: 600 }}>{formatBRL(item.subtotal)}</Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'common.black', mt: 1, pt: 1 }}>
            <Row label="Subtotal" value={formatBRL(subtotal)} />
            {(sale.discount ?? 0) > 0 && <Row label="Desconto" value={`-${formatBRL(sale.discount)}`} />}
            <Row label="Total" value={formatBRL(sale.total)} strong />
            <Row
              label={sale.credit ? 'Entrada paga' : 'Valor pago'}
              value={formatBRL(sale.amountPaid)}
            />
            {sale.change > 0 && <Row label="Troco" value={formatBRL(sale.change)} />}
            <Row
              label="Forma de pagamento"
              value={
                sale.isInstallment && sale.installmentCount
                  ? `${PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod} ${sale.installmentCount}x`
                  : (PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod)
              }
            />
          </Box>

          {sale.credit && (
            <>
              <SectionTitle>Crediário</SectionTitle>
              <Row label="Entrada" value={formatBRL(sale.credit.downPayment)} />
              <Row label="Valor financiado" value={formatBRL(sale.credit.totalAmount)} strong />
              <Row label="Parcelas" value={`${sale.credit.installmentCount}x`} />
              <Row label="Saldo devedor" value={formatBRL(sale.credit.balance)} strong />
              {sale.credit.note && <Row label="Observação" value={sale.credit.note} />}

              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, mt: 1 }}>
                <Box component="thead">
                  <Box component="tr" sx={{ '& th': { borderBottom: '1px solid', borderColor: 'common.black', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', py: 0.5 } }}>
                    <Box component="th" sx={{ textAlign: 'left', width: 64 }}>Parcela</Box>
                    <Box component="th" sx={{ textAlign: 'left' }}>Vencimento</Box>
                    <Box component="th" sx={{ textAlign: 'right', width: 96 }}>Valor</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {sale.creditInstallments.map((i) => (
                    <Box component="tr" key={i.id} sx={{ '& td': { py: 0.4 } }}>
                      <Box component="td">{i.number}/{i.ofTotal}</Box>
                      <Box component="td">{formatDueDate(i.dueDate)}</Box>
                      <Box component="td" sx={{ textAlign: 'right', fontWeight: 600 }}>{formatBRL(i.amount)}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          )}

          <Typography sx={{ fontSize: 10, mt: 3, textAlign: 'center' }}>
            Documento sem valor fiscal · Impresso em {formatDateTime(new Date().toISOString())}
          </Typography>
        </Box>
      </Box>
    </>,
    document.body,
  )
}
