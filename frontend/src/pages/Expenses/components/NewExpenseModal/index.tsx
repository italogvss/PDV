import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  TextField,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormHelperText,
  CircularProgress,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import SyncRounded from '@mui/icons-material/SyncRounded'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '../../types'
import type { ExpenseCategory, ExpenseStatus } from '../../types'
import type { NewExpenseModalProps } from './types'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(150),
  amount: z.coerce.number({ invalid_type_error: 'Valor inválido' }).positive('Deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  category: z.enum([
    'Aluguel', 'Fornecedor', 'Energia', 'Água', 'Internet',
    'Salários', 'Marketing', 'Impostos', 'Manutenção', 'Outros',
  ] as [ExpenseCategory, ...ExpenseCategory[]]),
  status: z.enum(['Pendente', 'Pago'] as [ExpenseStatus, ExpenseStatus]),
  recurring: z.boolean(),
})

type NewExpenseForm = z.infer<typeof schema>

const defaultValues: NewExpenseForm = {
  description: '',
  amount: 0,
  dueDate: '',
  category: 'Outros',
  status: 'Pendente',
  recurring: false,
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
      <DialogTitle sx={{ pb: 0.5 }}>
        Nova despesa
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Registre uma conta a pagar — recorrente ou pontual
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="new-expense-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}
        >
          {/* Descrição */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              Descrição <Typography component="span" variant="caption" color="error.main">*</Typography>
            </Typography>
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
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                Valor <Typography component="span" variant="caption" color="error.main">*</Typography>
              </Typography>
              <TextField
                {...register('amount')}
                fullWidth
                type="number"
                placeholder="0,00"
                error={!!errors.amount}
                helperText={errors.amount?.message}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
                  htmlInput: { step: 0.01, min: 0 },
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                Vencimento <Typography component="span" variant="caption" color="error.main">*</Typography>
              </Typography>
              <TextField
                {...register('dueDate')}
                fullWidth
                type="date"
                error={!!errors.dueDate}
                helperText={errors.dueDate?.message}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: { endAdornment: <CalendarTodayOutlined sx={{ fontSize: 16, color: 'text.tertiary' }} /> },
                }}
              />
            </Box>
          </Box>

          {/* Categoria */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Categoria <Typography component="span" variant="caption" color="error.main">*</Typography>
            </Typography>
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
                          label={cat}
                          clickable
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
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Status do pagamento
            </Typography>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value}
                  onChange={(_, val: ExpenseStatus | null) => val && field.onChange(val)}
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
                  <ToggleButton value="Pendente">A pagar</ToggleButton>
                  <ToggleButton value="Pago">Já paga</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>

          {/* Recorrente */}
          <Controller
            name="recurring"
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

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.tertiary">
          Os campos com <Typography component="span" variant="caption" color="error.main">*</Typography> são obrigatórios
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="new-expense-form"
            variant="contained"
            color="success"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : <SaveOutlined />}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar despesa'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
