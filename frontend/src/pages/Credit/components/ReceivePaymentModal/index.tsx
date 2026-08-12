import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  MenuItem,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import { PAYMENT_METHOD_LABELS } from '../../../../constants/payment'
import { useReceiveInstallment } from '../../../../hooks/useCredit'
import { formatBRL } from '../../../../utils/currency'
import { formatDueDate } from '../../types'
import type { Props } from './types'

const PAYMENT_METHODS = ['Cash', 'PIX', 'DebitCard', 'CreditCard'] as const

const schema = z.object({
  amount: z.coerce.number().positive('O valor deve ser maior que zero'),
  method: z.enum(PAYMENT_METHODS, { error: 'Selecione a forma de pagamento' }),
  receivedAt: z.string().min(1, 'Informe a data do recebimento'),
  note: z.string().max(500).optional(),
})

type ReceiveFormInput = z.input<typeof schema>
type ReceiveForm = z.infer<typeof schema>

export default function ReceivePaymentModal({ installment, onClose }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const receive = useReceiveInstallment()
  const isPending = receive.isPending

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReceiveFormInput, unknown, ReceiveForm>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, method: 'Cash', receivedAt: dayjs().format('YYYY-MM-DD'), note: '' },
  })

  // Abre já preenchido com o saldo da parcela: o caso comum é quitar integral, e quem
  // vai pagar parcial só precisa reduzir o valor.
  useEffect(() => {
    if (installment) {
      reset({
        amount: installment.balance,
        method: 'Cash',
        receivedAt: dayjs().format('YYYY-MM-DD'),
        note: '',
      })
    }
  }, [installment, reset])

  const amount = watch('amount')
  const remaining = installment ? installment.balance - Number(amount || 0) : 0

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  const onSubmit = (data: ReceiveForm) => {
    if (!installment) return
    receive.mutate(
      {
        installmentId: installment.id,
        amount: data.amount,
        method: data.method,
        receivedAt: data.receivedAt,
        note: data.note || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <Dialog
      open={installment !== null}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <ModalHeader
        title="Receber parcela"
        subtitle={
          installment
            ? `${installment.customerName} · parcela ${installment.number}/${installment.ofTotal} · vence ${formatDueDate(installment.dueDate)}`
            : undefined
        }
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="credit-receive-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}
        >
          {installment && (
            <Alert severity={installment.isOverdue ? 'warning' : 'info'} variant="outlined">
              Saldo da parcela: <strong>{formatBRL(installment.balance)}</strong>
              {installment.isOverdue && ` · ${installment.daysOverdue} dia(s) em atraso`}
            </Alert>
          )}

          <Box>
            <FieldLabel label="Valor recebido" required />
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <CurrencyField
                  value={Number(field.value) || 0}
                  // Trava no saldo da parcela: o backend recusa acima disso, e deixar digitar só
                  // para levar erro depois de submeter é ruído. Mesmo clamp da entrada no PDV.
                  onChange={(value) =>
                    field.onChange(installment ? Math.min(value, installment.balance) : value)
                  }
                  onBlur={field.onBlur}
                  fullWidth
                  size="small"
                  error={Boolean(errors.amount)}
                  helperText={
                    errors.amount?.message ??
                    (remaining > 0 ? `Restarão ${formatBRL(remaining)} nesta parcela` : undefined)
                  }
                />
              )}
            />
          </Box>

          <Box>
            <FieldLabel label="Forma de pagamento" required />
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  size="small"
                  error={Boolean(errors.method)}
                  helperText={errors.method?.message}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m] ?? m}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>

          <Box>
            <FieldLabel label="Data do recebimento" required />
            <Controller
              name="receivedAt"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(v) => field.onChange(v ? v.format('YYYY-MM-DD') : '')}
                  format="DD/MM/YYYY"
                  maxDate={dayjs()}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      error: Boolean(errors.receivedAt),
                      helperText: errors.receivedAt?.message,
                    },
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <FieldLabel label="Observação" />
            <TextField {...register('note')} fullWidth size="small" multiline rows={2} />
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="credit-receive-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Registrar recebimento"
        pendingLabel="Registrando..."
      />
    </Dialog>
  )
}
