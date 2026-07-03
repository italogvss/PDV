import { zodResolver } from '@hookform/resolvers/zod'
import SyncRounded from '@mui/icons-material/SyncRounded'
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded'
import {
  Box,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  FormHelperText,
  Paper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import CurrencyField from '../../../../components/CurrencyField'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ModalHeader from '../../../../components/ModalHeader'
import UpsellModal from '../../../../components/UpsellModal'
import { FEATURES } from '../../../../constants/entitlements'
import { useCreateExpense, useUpdateExpense } from '../../../../hooks/useExpenses'
import { useEntitlements } from '../../../../hooks/useSubscription'
import type { ExpenseCategory } from '../../types'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '../../types'
import type { NewExpenseModalProps } from './types'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(500),
  amount: z.coerce.number().positive('Deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]], {
    errorMap: () => ({ message: 'Selecione uma categoria' }),
  }),
  isPaid: z.boolean(),
  isRecurring: z.boolean(),
  repeatCount: z.number()
    .int('Deve ser um número inteiro')
    .positive('Deve ser maior que zero')
    .max(60, 'Não pode ser maior que 60')
    .nullable()
    .optional(),
})

type ExpenseForm = z.infer<typeof schema>

const emptyDefaults: ExpenseForm = {
  description: '',
  amount: 0,
  dueDate: new Date().toISOString().split('T')[0],
  category: 'Outros',
  isPaid: false,
  isRecurring: false,
  repeatCount: null,
}

export default function NewExpenseModal({ open, onClose, expense }: NewExpenseModalProps) {
  const isEditing = !!expense
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { has } = useEntitlements()
  const hasAdvancedExpenses = has(FEATURES.advancedExpenses)
  const [upsellOpen, setUpsellOpen] = useState(false)

  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const isPending = createExpense.isPending || updateExpense.isPending
  const isRecurring = watch('isRecurring')

  useEffect(() => {
    if (open) {
      if (expense) {
        reset({
          description: expense.description,
          amount: expense.amount,
          dueDate: expense.dueDate.split('T')[0],
          category: expense.category,
          isPaid: expense.isPaid,
          isRecurring: expense.isRecurring,
          repeatCount: expense.repeatCount ?? null,
        })
      } else {
        reset(emptyDefaults)
      }
    }
  }, [open, expense, reset])

  const onSubmit = async (data: ExpenseForm) => {
    const payload = {
      description: data.description,
      category: data.category,
      amount: data.amount,
      dueDate: new Date(data.dueDate).toISOString(),
      isPaid: data.isPaid,
      isRecurring: data.isRecurring,
      repeatCount: data.isRecurring ? (data.repeatCount ?? null) : null,
    }

    if (isEditing) {
      await updateExpense.mutateAsync({ id: expense.id, ...payload })
    } else {
      await createExpense.mutateAsync(payload)
    }

    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <ModalHeader
        title={isEditing ? 'Editar despesa' : 'Nova despesa'}
        subtitle={
          isEditing
            ? 'Atualize os dados da despesa'
            : 'Registre uma conta a pagar — recorrente ou pontual'
        }
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="expense-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}
        >

          {/* Categoria */}
          <Box>
            <FieldLabel label="Categoria" required />
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const selected = field.value === cat
                      return (
                        <Chip
                          key={cat}
                          label={EXPENSE_CATEGORY_LABELS[cat].label}
                          clickable
                          size="large"
                          onClick={() => {
                            field.onChange(cat)
                            const desc = getValues('description')
                            const isCategoryLabel = EXPENSE_CATEGORIES.some(
                              (c) => EXPENSE_CATEGORY_LABELS[c].label === desc
                            )
                            if (!desc || isCategoryLabel) {
                              setValue('description', EXPENSE_CATEGORY_LABELS[cat].label)
                            }
                          }}
                          variant={selected ? 'filled' : 'outlined'}
                          sx={selected ? {
                            bgcolor: EXPENSE_CATEGORY_LABELS[cat].color,
                            color: 'background.paper',
                            borderColor: EXPENSE_CATEGORY_LABELS[cat].color,
                            fontWeight: 600,

                            '&:hover': { bgcolor: EXPENSE_CATEGORY_LABELS[cat].color, },
                          } : {
                            borderColor: 'border.subtle',
                            color: 'text.secondary',
                            fontWeight: 500,
                            '&:hover': { borderColor: EXPENSE_CATEGORY_LABELS[cat].color, },
                          }}
                        />
                      )
                    })}
                  </Box>
                  {errors.category && (
                    <FormHelperText error sx={{ mt: 0.5 }}>{errors.category.message}</FormHelperText>
                  )}
                </Box>
              )}
            />
          </Box>

          {/* Descrição */}
          <Box>
            <FieldLabel label="Descrição" required />
            <TextField
              {...register('description')}
              fullWidth
              placeholder="Ex.: Conta de luz - Maio"
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          </Box>

          {/* Valor + Vencimento */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Valor" required />
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    value={Number(field.value) || 0}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    fullWidth
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Vencimento" required />
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(newValue) => field.onChange(newValue ? newValue.format('YYYY-MM-DD') : '')}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.dueDate,
                        helperText: errors.dueDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Box>
          </Box>



          {/* Status */}
          <Box>
            <FieldLabel label="Status do pagamento" />
            <Controller
              name="isPaid"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value ? 'paid' : 'pending'}
                  onChange={(_, val: 'paid' | 'pending' | null) => val && field.onChange(val === 'paid')}
                  size="small"
                >
                  <ToggleButton value="pending">A pagar</ToggleButton>
                  <ToggleButton value="paid">Já paga</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>
          {hasAdvancedExpenses ? (
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: "surface.sunken", borderColor: "border.strong" }}>
              {/* Recorrente */}
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SyncRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Despesa recorrente mensal
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Marque esta opção se a despesa se repete todo mês (aluguel, internet, salários...).
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </Box>
                )}
              />

              {/* Número de repetições (apenas quando recorrente) */}
              <Collapse in={isRecurring}>
                <Box>
                  <FieldLabel label="Repetir por quantos meses?" />
                  <TextField
                    {...register('repeatCount', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
                    type="number"
                    fullWidth
                    placeholder="Ex.: 12"
                    inputProps={{ min: 1 }}
                    error={!!errors.repeatCount}
                    helperText={errors.repeatCount?.message ?? 'Deixe em branco para repetir indefinidamente'}
                  />
                </Box>
              </Collapse>
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              role="button"
              aria-label="Despesas recorrentes — recurso do plano Pro"
              onClick={() => setUpsellOpen(true)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                borderStyle: 'dashed',
                borderColor: 'premium.400',
                bgcolor: (t) => alpha(t.palette.premium[100], 0.4),
                transition: 'background-color .15s',
                '&:hover': { bgcolor: (t) => alpha(t.palette.premium[200], 0.55) },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'premium.400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 2,
                }}
              >
                <WorkspacePremiumRounded sx={{ fontSize: 20, color: 'premium.900' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Despesa recorrente mensal
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatize contas fixas como aluguel e internet com o plano Pro.
                </Typography>
              </Box>
              <Chip label="Pro" color="premium" size="small" />
            </Paper>
          )}
        </Box>
      </DialogContent>

      <UpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        title="Despesas recorrentes no Pro"
        description="Cadastrar despesas que se repetem todo mês é um recurso do plano Pro. Faça upgrade para automatizar suas contas fixas."
      />

      <FormModalActions
        formId="expense-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Dialog>
  )
}
