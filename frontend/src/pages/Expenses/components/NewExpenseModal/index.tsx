import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  Chip,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormHelperText,
  Switch,
} from '@mui/material'
import SyncRounded from '@mui/icons-material/SyncRounded'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '../../types'
import type { ExpenseCategory } from '../../types'
import type { NewExpenseModalProps } from './types'
import { useCreateExpense, useUpdateExpense } from '../../../../hooks/useExpenses'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(150),
  amount: z.coerce.number({ invalid_type_error: 'Valor inválido' }).positive('Deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]], {
    errorMap: () => ({ message: 'Selecione uma categoria' }),
  }),
  isPaid: z.boolean(),
  isRecurring: z.boolean(),
})

type ExpenseForm = z.infer<typeof schema>

const emptyDefaults: ExpenseForm = {
  description: '',
  amount: 0,
  dueDate: new Date().toISOString().split('T')[0],
  category: 'Outros',
  isPaid: false,
  isRecurring: false,
}

export default function NewExpenseModal({ open, onClose, expense }: NewExpenseModalProps) {
  const isEditing = !!expense
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const isPending = createExpense.isPending || updateExpense.isPending

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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
                          label={EXPENSE_CATEGORY_LABELS[cat]}
                          clickable
                          size="large"
                          onClick={() => field.onChange(cat)}
                          variant={selected ? 'filled' : 'outlined'}
                          sx={selected ? {
                            bgcolor: 'text.primary',
                            color: 'background.paper',
                            borderColor: 'text.primary',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'text.primary' },
                          } : {
                            borderColor: 'border.subtle',
                            color: 'text.secondary',
                            fontWeight: 500,
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
                  sx={{
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: 13,
                      px: 2,
                      borderColor: 'border.subtle',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        bgcolor: 'text.primary',
                        color: 'background.paper',
                        borderColor: 'text.primary',
                        '&:hover': { bgcolor: 'text.primary' },
                      },
                    },
                  }}
                >
                  <ToggleButton value="pending">A pagar</ToggleButton>
                  <ToggleButton value="paid">Já paga</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>

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
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'border.subtle',
                  bgcolor: 'surface.sunken',
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
                  size="small"
                />
              </Box>
            )}
          />
        </Box>
      </DialogContent>

      <FormModalActions
        formId="expense-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Dialog>
  )
}
