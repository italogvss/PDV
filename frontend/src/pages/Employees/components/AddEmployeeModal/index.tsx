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
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EMPLOYEE_ROLES, EMPLOYEE_SHIFTS } from '../../types'
import type { AddEmployeeModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['Gerente', 'Atendente', 'Caixa', 'Estoquista']),
  shift: z.enum(['Turno Integral', 'Turno Manhã', 'Turno Tarde', 'Turno Noite']),
})

type AddEmployeeForm = z.infer<typeof schema>

const defaultValues: AddEmployeeForm = {
  name: '',
  role: 'Atendente',
  shift: 'Turno Manhã',
}

export default function AddEmployeeModal({ open, onClose }: AddEmployeeModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddEmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const onSubmit = async (data: AddEmployeeForm) => {
    // TODO: integrar com employeesService.create(data)
    await new Promise<void>((resolve) => setTimeout(resolve, 800))
    console.log('Novo funcionário:', data)
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
      <DialogTitle>Adicionar funcionário</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="add-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <TextField
            {...register('name')}
            label="Nome completo"
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.role}>
                  <InputLabel>Função</InputLabel>
                  <Select {...field} label="Função">
                    {EMPLOYEE_ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Controller
              name="shift"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.shift}>
                  <InputLabel>Turno</InputLabel>
                  <Select {...field} label="Turno">
                    {EMPLOYEE_SHIFTS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.shift && (
                    <FormHelperText>{errors.shift.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="add-employee-form"
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
          {isSubmitting ? 'Salvando...' : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
