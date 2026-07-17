import { useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, InputAdornment, MenuItem, TextField, useMediaQuery, useTheme } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs, { type Dayjs } from 'dayjs'
import ModalHeader from '../../../../../components/ModalHeader'
import FormModalActions from '../../../../../components/FormModalActions'
import FieldLabel from '../../../../../components/FieldLabel'
import CurrencyField from '../../../../../components/CurrencyField'
import { useCreateCoupon } from '../../../../hooks/useAdmin'
import type { CreateCouponPayload } from '../../../../types/admin.types'

const schema = z.object({
  code: z.string().trim().min(1, 'Informe o código.'),
  name: z.string(),
  discountType: z.enum(['percent', 'amount']),
  percentOff: z.number(),
  amountReais: z.number(),
  duration: z.enum(['once', 'repeating', 'forever']),
  durationInMonths: z.number(),
  maxRedemptions: z.number(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  code: '',
  name: '',
  discountType: 'percent',
  percentOff: 10,
  amountReais: 0,
  duration: 'once',
  durationInMonths: 1,
  maxRedemptions: 0,
}

interface Props {
  open: boolean
  onClose: () => void
}

// Só criação — o Stripe não permite editar valor/duração de um cupom nem os limites de um
// Promotion Code depois de criados. "Remover" (na tela) desativa; não há "editar".
export default function CouponModal({ open, onClose }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const createCoupon = useCreateCoupon()
  const isPending = createCoupon.isPending

  const [expiresAt, setExpiresAt] = useState<Dayjs | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  const discountType = watch('discountType')
  const duration = watch('duration')

  useEffect(() => {
    if (!open) return
    reset(DEFAULTS)
    setExpiresAt(null)
  }, [open, reset])

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  const onSubmit = (values: FormValues) => {
    const payload: CreateCouponPayload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim() || null,
      percentOff: values.discountType === 'percent' ? values.percentOff : null,
      amountOffCents: values.discountType === 'amount' ? Math.round(values.amountReais * 100) : null,
      duration: values.duration,
      durationInMonths: values.duration === 'repeating' ? values.durationInMonths : null,
      maxRedemptions: values.maxRedemptions > 0 ? values.maxRedemptions : null,
      expiresAt: expiresAt ? expiresAt.endOf('day').toISOString() : null,
    }
    createCoupon.mutate(payload, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <ModalHeader
        title="Novo cupom"
        subtitle="Cria o desconto e o código no Stripe."
        onClose={handleClose}
        disabled={isPending}
      />
      <DialogContent>
        <Box
          component="form"
          id="coupon-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Código" required />
              <TextField
                {...register('code')}
                fullWidth
                size="small"
                placeholder="TRIAL30"
                error={!!errors.code}
                helperText={errors.code?.message}
              />
            </Box>
            <Box>
              <FieldLabel label="Nome interno" />
              <TextField {...register('name')} fullWidth size="small" placeholder="Desconto pós-trial" />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Tipo de desconto" />
              <Controller
                control={control}
                name="discountType"
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small">
                    <MenuItem value="percent">Percentual</MenuItem>
                    <MenuItem value="amount">Valor fixo</MenuItem>
                  </TextField>
                )}
              />
            </Box>
            <Box>
              <FieldLabel label="Valor" required />
              {discountType === 'percent' ? (
                <Controller
                  control={control}
                  name="percentOff"
                  render={({ field }) => (
                    <TextField
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
                      fullWidth
                      size="small"
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                    />
                  )}
                />
              ) : (
                <Controller
                  control={control}
                  name="amountReais"
                  render={({ field }) => (
                    <CurrencyField value={field.value} onChange={field.onChange} onBlur={field.onBlur} fullWidth size="small" />
                  )}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Duração" />
              <Controller
                control={control}
                name="duration"
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small">
                    <MenuItem value="once">Única cobrança</MenuItem>
                    <MenuItem value="repeating">Recorrente (N meses)</MenuItem>
                    <MenuItem value="forever">Para sempre</MenuItem>
                  </TextField>
                )}
              />
            </Box>
            {duration === 'repeating' && (
              <Box>
                <FieldLabel label="Por quantos meses" required />
                <Controller
                  control={control}
                  name="durationInMonths"
                  render={({ field }) => (
                    <TextField
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <FieldLabel label="Limite de resgates" />
              <Controller
                control={control}
                name="maxRedemptions"
                render={({ field }) => (
                  <TextField
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    onBlur={field.onBlur}
                    fullWidth
                    size="small"
                    placeholder="Sem limite"
                  />
                )}
              />
            </Box>
            <Box>
              <FieldLabel label="Expira em" />
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                minDate={dayjs()}
                slotProps={{ textField: { size: 'small', fullWidth: true }, field: { clearable: true } }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <FormModalActions formId="coupon-form" onCancel={handleClose} isPending={isPending} submitLabel="Criar cupom" />
    </Dialog>
  )
}
