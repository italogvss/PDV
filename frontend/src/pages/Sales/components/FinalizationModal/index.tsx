import {
  CheckCircleRounded,
  CloseRounded,
  CreditScoreRounded,
  LocalOfferRounded,
  PersonAddAlt1Rounded,
  PersonRounded,
  PrintRounded,
  StorefrontRounded,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import SaleReceipt from '../../../../components/SaleReceipt'
import { usePdvSettings } from '../../../../hooks/useTenantSettings'
import { useUserPermissions } from '../../../../hooks/useUserPermissions'
import type { SaleDetail } from '../../../../types/sale.types'
import { buildInstallmentPlan } from '../../../../utils/creditPlan'
import { formatBRL } from '../../../../utils/currency'
import { maskCPF } from '../../../../utils/masks'
import { printDocument } from '../../../../utils/print'
import type { CardType, PaymentMethod, SaleKind } from '../../types'
import PaymentSection from './components/PaymentSection'
import type { FinalizationModalProps } from './types'

const FALLBACK_PAYMENTS = {
  feesEnabled: false,
  pix: { enabled: true, fee: 0 },
  cardCredit: { enabled: true, fee: 0 },
  cardDebit: { enabled: true, fee: 0 },
  cash: { enabled: true, fee: 0 },
  credit: { maxInstallments: 12, firstDueDays: 30, minDownPaymentPercent: 0 },
}

function buildPaymentMethod(method: PaymentMethod, cardType: CardType): string {
  if (method === 'cash') return 'Cash'
  if (method === 'pix') return 'PIX'
  if (cardType === 'credit') return 'CreditCard'
  return 'DebitCard'
}

function SummaryRow({ label, value, color, strong }: {
  label: string
  value: string
  color?: string
  strong?: boolean
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 600, color }}>{value}</Typography>
    </Box>
  )
}

/**
 * Onde a venda é DECIDIDA: cliente, desconto, forma de pagamento e crediário. A página de
 * venda só monta o carrinho — por isso todo o estado de decisão nasce e morre aqui, resetado
 * a cada abertura.
 */
export default function FinalizationModal({
  open,
  onClose,
  lines,
  subtotal,
  customer,
  onCustomerChange,
  onOpenCustomerModal,
  onFinalize,
  isSubmitting,
  onNewSale,
}: FinalizationModalProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { isModuleEnabled, hasPermission } = useUserPermissions()
  const { data: tenantSettings } = usePdvSettings()

  // Enquanto as configurações carregam, libera todos os métodos para não travar a venda.
  const payments = tenantSettings?.payments ?? FALLBACK_PAYMENTS
  const creditPolicy = payments.credit ?? FALLBACK_PAYMENTS.credit
  const allowDiscounts = tenantSettings?.operation.allowDiscounts ?? false
  const discountLimitPercent = tenantSettings?.operation.discountLimitPercent ?? 0
  const requireCustomerOnSale = tenantSettings?.operation.requireCustomerOnSale ?? false

  const customersModuleActive = isModuleEnabled('customers')
  // Eixo de acesso (módulo do tenant + permissão do cargo), não de plano: o módulo Crediário
  // é livre nos dois planos, então aqui esconder é correto.
  const creditAvailable = isModuleEnabled('credit') && hasPermission('ManageCredit')

  const [saleKind, setSaleKind] = useState<SaleKind>('cash')
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [installments, setInstallments] = useState(1)
  const [cashReceived, setCashReceived] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [downPayment, setDownPayment] = useState(0)
  const [creditInstallments, setCreditInstallments] = useState(1)
  const [firstDueDate, setFirstDueDate] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [completedSale, setCompletedSale] = useState<SaleDetail | null>(null)

  // Reset a cada abertura — a modal não pode herdar as decisões da venda anterior.
  //
  // A dependência é SÓ `open`. `creditPolicy.firstDueDays` entra no cálculo mas não pode entrar na
  // lista: enquanto `usePdvSettings` não resolve, a política é o FALLBACK, e a resposta chegando
  // depois mudava a dependência e rodava o reset com a modal ABERTA — apagando desconto, entrada,
  // parcelas e observação já digitados, e até a tela de "Venda concluída" (que vive em
  // `completedSale`). O prazo padrão só precisa valer no instante da abertura.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    setSaleKind('cash')
    setMethod('card')
    setCardType('credit')
    setInstallments(1)
    setCashReceived('')
    setDiscountAmount(0)
    setDownPayment(0)
    setCreditInstallments(1)
    setFirstDueDate(dayjs().add(creditPolicy.firstDueDays, 'day').format('YYYY-MM-DD'))
    setCreditNote('')
    setCompletedSale(null)
  }, [open])

  // Garante que o método/tipo de cartão selecionado esteja habilitado nas configurações.
  useEffect(() => {
    const cardEnabled = payments.cardCredit.enabled || payments.cardDebit.enabled
    const isEnabled = (m: PaymentMethod) =>
      m === 'pix' ? payments.pix.enabled : m === 'cash' ? payments.cash.enabled : cardEnabled

    if (!isEnabled(method)) {
      const next = (['card', 'pix', 'cash'] as PaymentMethod[]).find(isEnabled)
      if (next) setMethod(next)
    }
    if (cardType === 'credit' && !payments.cardCredit.enabled && payments.cardDebit.enabled) {
      setCardType('debit')
    } else if (cardType === 'debit' && !payments.cardDebit.enabled && payments.cardCredit.enabled) {
      setCardType('credit')
    }
  }, [payments, method, cardType])

  const isCredit = saleKind === 'credit'

  // Clamp ÚNICO do desconto (limite % da loja e nunca acima do subtotal). Antes existia em
  // dois lugares com regras diferentes, e a modal chegava a mostrar um valor fora do limite.
  const maxDiscount = allowDiscounts ? Math.min(subtotal, (subtotal * discountLimitPercent) / 100) : 0
  const discount = Math.min(discountAmount, maxDiscount)
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0
  const total = Math.max(0, subtotal - discount)

  // Arredonda para CIMA de propósito. O backend calcula o mesmo mínimo com o Math.Round do .NET,
  // que é bancário (empate vai para o par) — em meio centavo exato os dois discordariam e a modal
  // liberaria uma entrada que a API recusa. Pedir um centavo a mais nunca produz esse erro.
  const minDownPayment = Math.ceil(total * (creditPolicy.minDownPaymentPercent / 100) * 100) / 100
  const financed = Math.max(0, total - downPayment)
  const maxCreditInstallments = Math.max(1, Math.min(60, creditPolicy.maxInstallments))

  const plan = useMemo(
    () => (isCredit ? buildInstallmentPlan(financed, creditInstallments, firstDueDate) : []),
    [isCredit, financed, creditInstallments, firstDueDate],
  )

  // Rótulo de cada opção do seletor vindo do MESMO planner que monta o carnê. Com `financed / n`
  // cru o seletor dizia "3x de R$ 33,33" enquanto a primeira linha do preview logo abaixo mostrava
  // R$ 33,34 (a sobra do arredondamento vai toda na parcela #1). Usa a ÚLTIMA parcela, que é a
  // recorrente — a #1 aparece com o valor exato no preview.
  const installmentOptions = useMemo(
    () =>
      Array.from({ length: maxCreditInstallments }, (_, i) => i + 1).map((count) => {
        const parcels = buildInstallmentPlan(financed, count, firstDueDate)
        return { count, amount: parcels.length > 0 ? parcels[parcels.length - 1].amount : 0 }
      }),
    [maxCreditInstallments, financed, firstDueDate],
  )

  // O teto da loja pode ter caído desde que o operador escolheu — reancora em vez de enviar inválido.
  useEffect(() => {
    if (creditInstallments > maxCreditInstallments) setCreditInstallments(maxCreditInstallments)
  }, [creditInstallments, maxCreditInstallments])

  const customerProvided = requireCustomerOnSale
    ? customer.type === 'entity'
    : customer.type === 'entity' || (customer.type === 'cpf' && customer.document.trim().length > 0)
  const customerMissing = customersModuleActive && requireCustomerOnSale && !customerProvided
  // Fiado exige cliente cadastrado: um CPF solto não diz de quem cobrar (docs/crediario.md §1).
  const creditNeedsCustomer = isCredit && customer.type !== 'entity'
  const downPaymentInvalid = isCredit && (downPayment >= total || downPayment < minDownPayment)

  const blockReason = customerMissing
    ? 'Selecione um cliente para finalizar a venda'
    : creditNeedsCustomer
      ? 'Venda no crediário exige um cliente cadastrado'
      : downPayment >= total && isCredit
        ? 'A entrada precisa ser menor que o total da venda'
        : downPaymentInvalid
          ? `A entrada mínima desta loja é ${formatBRL(minDownPayment)}`
          : ''

  const canSubmit = !blockReason && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    const receivedNumber = Number(cashReceived.replace(',', '.'))
    const cashAmount =
      method === 'cash' && !Number.isNaN(receivedNumber) && cashReceived.trim() !== ''
        ? receivedNumber
        : total
    const useCardInstallments = !isCredit && method === 'card' && cardType === 'credit' && installments > 1

    const sale = await onFinalize({
      customerId: customer.type === 'entity' ? customer.id : undefined,
      customerDocument: customer.type === 'cpf' ? customer.document : undefined,
      paymentMethod: buildPaymentMethod(method, cardType),
      isInstallment: useCardInstallments,
      installmentCount: useCardInstallments ? installments : undefined,
      // No fiado o que entrou no caixa é só a entrada — o resto vem nas baixas das parcelas.
      amountPaid: isCredit ? downPayment : cashAmount,
      discount,
      credit: isCredit
        ? {
            installmentCount: creditInstallments,
            firstDueDate,
            downPayment,
            note: creditNote.trim() || undefined,
          }
        : undefined,
    })

    if (sale) setCompletedSale(sale)
  }

  const handleClose = () => {
    if (isSubmitting) return
    // Depois de concluída, fechar equivale a começar a próxima venda: o carrinho já foi vendido.
    if (completedSale) onNewSale()
    else onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={completedSale ? 'xs' : 'md'}
      fullWidth
      fullScreen={isMobile}
    >
      {completedSale ? (
        <>
          <ModalHeader title="Venda concluída" onClose={handleClose} />
          <DialogContent sx={{ pt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2 }}>
              <CheckCircleRounded sx={{ fontSize: 48, color: 'success.main' }} />
              <Typography variant="h3">{formatBRL(completedSale.total)}</Typography>
              <Typography variant="body2" color="text.tertiary">
                Venda {completedSale.id.slice(0, 8).toUpperCase()}
              </Typography>
              {completedSale.credit && (
                <Alert severity="info" variant="outlined" sx={{ width: '100%' }}>
                  Crediário aberto: {completedSale.credit.installmentCount}x ·{' '}
                  {formatBRL(completedSale.credit.totalAmount)} a receber
                </Alert>
              )}
              {completedSale.change > 0 && (
                <Alert severity="success" variant="outlined" sx={{ width: '100%' }}>
                  Troco: <strong>{formatBRL(completedSale.change)}</strong>
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ gap: 1 }}>
            <Button variant="ghost" startIcon={<PrintRounded />} onClick={printDocument}>
              Imprimir comprovante
            </Button>
            <Button variant="contained" onClick={onNewSale}>
              Nova venda
            </Button>
          </DialogActions>

          <SaleReceipt sale={completedSale} business={tenantSettings?.business} />
        </>
      ) : (
        <>
          <ModalHeader
            title="Finalizar venda"
            subtitle="Confira o resumo e informe como esta venda será paga"
            onClose={handleClose}
            disabled={isSubmitting}
          />

          <DialogContent sx={{ pt: 2.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
                gap: 3,
                alignItems: 'start',
              }}
            >
              {/* Coluna A — resumo do que está sendo vendido */}
              <Box
                sx={{
                  backgroundColor: 'surface.sunken',
                  border: '1px solid',
                  borderColor: 'border.strong',
                  px: 2,
                  py: 2,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Itens
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 220, overflowY: 'auto' }}>
                  {lines.map((line) => {
                    const name = line.type === 'product' ? line.product.name : line.service.name
                    const price = line.type === 'product' ? line.product.price : line.service.price
                    return (
                      <Box
                        key={line.type === 'product' ? line.productId : line.lineId}
                        sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}
                      >
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 2 }}>
                          {line.quantity}× {name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                          {formatBRL(price * line.quantity)}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 2 }}>
                  <SummaryRow label="Subtotal" value={formatBRL(subtotal)} />
                  {discount > 0 && (
                    <SummaryRow label="Desconto" value={`-${formatBRL(discount)}`} color="error.main" />
                  )}
                  <Divider sx={{ my: 0.5, borderColor: 'border.strong', borderStyle: 'dashed' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Total</Typography>
                    <Typography variant="h3" sx={{ color: 'text.primary' }}>{formatBRL(total)}</Typography>
                  </Box>
                  {isCredit && (
                    <>
                      <SummaryRow label="Entrada" value={formatBRL(downPayment)} />
                      <SummaryRow label="A financiar" value={formatBRL(financed)} strong />
                    </>
                  )}
                </Box>
              </Box>

              {/* Coluna B — as decisões da venda */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {customersModuleActive && (
                  <Box>
                    <FieldLabel label="Cliente" required={requireCustomerOnSale || isCredit} />
                    {customer.type === 'entity' ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          height: 40,
                          borderRadius: 1.5,
                          border: 1,
                          borderColor: 'secondary.main',
                        }}
                      >
                        <PersonRounded sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main', flex: 1 }} noWrap>
                          {customer.name}
                        </Typography>
                        <IconButton
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => onCustomerChange({ type: 'none' })}
                          sx={{ p: 0.25, color: 'error.ink', flexShrink: 0 }}
                        >
                          <CloseRounded sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PersonAddAlt1Rounded />}
                          onClick={onOpenCustomerModal}
                          sx={{ flexShrink: 0 }}
                        >
                          Selecionar
                        </Button>
                        <TextField
                          placeholder={requireCustomerOnSale ? 'CPF *' : 'CPF (opcional)'}
                          size="small"
                          fullWidth
                          disabled={isCredit}
                          value={customer.type === 'cpf' ? customer.document : ''}
                          onChange={(e) => {
                            const val = maskCPF(e.target.value)
                            onCustomerChange(val ? { type: 'cpf', document: val } : { type: 'none' })
                          }}
                          slotProps={{ htmlInput: { maxLength: 14 } }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {allowDiscounts && (
                  <Box>
                    <FieldLabel label={`Desconto — limite ${discountLimitPercent}% (${formatBRL(maxDiscount)})`} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CurrencyField
                        value={discountAmount}
                        onChange={(value) => setDiscountAmount(Math.min(value, maxDiscount))}
                        size="small"
                        fullWidth
                        placeholder="0,00"
                      />
                      {discount > 0 && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: '10px',
                            bgcolor: 'warning.soft',
                            flexShrink: 0,
                          }}
                        >
                          <LocalOfferRounded sx={{ fontSize: 13, color: 'warning.main' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.ink' }}>
                            -{discountPercent.toFixed(1)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {creditAvailable && (
                  <Box>
                    <FieldLabel label="Tipo de venda" />
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      size="small"
                      value={saleKind}
                      onChange={(_, value: SaleKind | null) => value && setSaleKind(value)}
                    >
                      <ToggleButton value="cash">
                        <StorefrontRounded sx={{ fontSize: 16 }} />
                        À vista
                      </ToggleButton>
                      <ToggleButton value="credit">
                        <CreditScoreRounded sx={{ fontSize: 16 }} />
                        Crediário
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}

                {isCredit && (
                  <Box>
                    <FieldLabel
                      label={`Entrada${creditPolicy.minDownPaymentPercent > 0 ? ` — mínimo ${creditPolicy.minDownPaymentPercent}% (${formatBRL(minDownPayment)})` : ' (opcional)'}`}
                    />
                    <CurrencyField
                      value={downPayment}
                      onChange={(value) => setDownPayment(Math.min(value, total))}
                      size="small"
                      fullWidth
                      error={downPaymentInvalid}
                      helperText={downPaymentInvalid ? blockReason : undefined}
                    />
                  </Box>
                )}

                {/* Sem entrada nenhuma o método não captura nada: a taxa da venda vai a zero e
                    o campo só confundiria o operador. */}
                {(!isCredit || downPayment > 0) && (
                  <Box>
                    <FieldLabel label={isCredit ? 'Forma de pagamento da entrada' : 'Forma de pagamento'} />
                    <PaymentSection
                      variant={isCredit ? 'downPayment' : 'sale'}
                      method={method}
                      onMethodChange={setMethod}
                      cardType={cardType}
                      onCardTypeChange={setCardType}
                      installments={installments}
                      onInstallmentsChange={setInstallments}
                      total={total}
                      cashReceived={cashReceived}
                      onCashReceivedChange={setCashReceived}
                      payments={payments}
                    />
                  </Box>
                )}

                {isCredit && (
                  <>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <FieldLabel label="Parcelas" required />
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={creditInstallments}
                          onChange={(e) => setCreditInstallments(Number(e.target.value))}
                        >
                          {installmentOptions.map(({ count, amount }) => (
                            <MenuItem key={count} value={count}>
                              {count}x de {formatBRL(amount)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <FieldLabel label="1º vencimento" required />
                        <DatePicker
                          value={firstDueDate ? dayjs(firstDueDate) : null}
                          onChange={(v) => setFirstDueDate(v ? v.format('YYYY-MM-DD') : '')}
                          format="DD/MM/YYYY"
                          minDate={dayjs()}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </Box>
                    </Box>

                    <Box>
                      <FieldLabel label="Observação" />
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value.slice(0, 500))}
                        placeholder="Combinado com o cliente, referência do carnê..."
                      />
                    </Box>

                    {plan.length > 0 && (
                      <Box
                        sx={{
                          border: 1,
                          borderColor: 'border.subtle',
                          borderRadius: 2,
                          maxHeight: 180,
                          overflowY: 'auto',
                        }}
                      >
                        {plan.map((p) => (
                          <Box
                            key={p.number}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              px: 1.5,
                              py: 0.75,
                              borderBottom: 1,
                              borderColor: 'border.subtle',
                              '&:last-of-type': { borderBottom: 0 },
                            }}
                          >
                            <Typography variant="caption" color="text.tertiary">
                              {p.number}/{plan.length} · {dayjs(p.dueDate).format('DD/MM/YYYY')}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {formatBRL(p.amount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          </DialogContent>

          <FormModalActions
            onCancel={handleClose}
            onSubmit={handleSubmit}
            isPending={isSubmitting}
            submitLabel={isCredit ? 'Concluir e abrir crediário' : 'Concluir venda'}
            pendingLabel="Registrando..."
            submitDisabled={!canSubmit}
            showRequiredHint={false}
            hint={
              blockReason ? (
                <Tooltip title={blockReason} placement="top" arrow>
                  <Typography variant="caption" color="error.main">{blockReason}</Typography>
                </Tooltip>
              ) : undefined
            }
          />
        </>
      )}
    </Dialog>
  )
}
