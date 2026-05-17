import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '../../types'
import type { NewExpenseModalProps } from './types'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(150),
  category: z.enum([
    'Aluguel',
    'Fornecedor',
    'Energia',
    'Salários',
    'Marketing',
    'Internet',
    'Outros',
  ]),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  amount: z.coerce
    .number({ invalid_type_error: 'Valor inválido' })
    .positive('Deve ser maior que zero'),
})

type NewExpenseForm = z.infer<typeof schema>

const defaultValues: NewExpenseForm = {
  description: '',
  category: 'Outros',
  dueDate: '',
  amount: 0,
}

export default function NewExpenseModal({ open, onClose }: NewExpenseModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewExpenseForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const onSubmit = async (data: NewExpenseForm) => {
    // TODO: integrar com expensesService.create(data)
    await new Promise<void>((resolve) => setTimeout(resolve, 800))
    console.log('Nova despesa:', data)
    reset(defaultValues)
    onClose()
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset(defaultValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nova despesa</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="new-expense-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <TextField
            {...register('description')}
            label="Descrição"
            fullWidth
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.category}>
                  <InputLabel>Categoria</InputLabel>
                  <Select {...field} label="Categoria">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <FormHelperText>{errors.category.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <TextField
              {...register('dueDate')}
              label="Vencimento"
              type="date"
              fullWidth
              error={!!errors.dueDate}
              helperText={errors.dueDate?.message}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <TextField
            {...register('amount')}
            label="Valor"
            type="number"
            fullWidth
            error={!!errors.amount}
            helperText={errors.amount?.message}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              },
              htmlInput: { step: 0.01, min: 0 },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="new-expense-form"
          variant="contained"
          color="success"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <AddRounded />
            )
          }
        >
          {isSubmitting ? 'Salvando...' : 'Salvar despesa'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
