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
import SaveRounded from '@mui/icons-material/SaveRounded'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateEmployee } from '../../../../hooks/useEmployees'
import type { EditEmployeeModalProps } from './types'

const schema = z.object({
  employeeType: z.enum(['Manager', 'Employee']),
  position: z.string().min(1, 'Cargo é obrigatório').max(100),
  salary: z.coerce.number().positive('Salário deve ser positivo').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type EditEmployeeForm = z.infer<typeof schema>

export default function EditEmployeeModal({ employee, open, onClose }: EditEmployeeModalProps) {
  const updateEmployee = useUpdateEmployee()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditEmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeType: employee.employeeType,
      position: employee.position,
      salary: employee.salary ?? '',
      phone: employee.phone ?? '',
    },
  })

  const onSubmit = async (data: EditEmployeeForm) => {
    await updateEmployee.mutateAsync({
      id: employee.id,
      payload: {
        employeeType: data.employeeType,
        position: data.position,
        salary: data.salary ? Number(data.salary) : undefined,
        phone: data.phone || undefined,
      },
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar funcionário</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="edit-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="employeeType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.employeeType}>
                  <InputLabel>Tipo</InputLabel>
                  <Select {...field} label="Tipo">
                    <MenuItem value="Manager">Gerente</MenuItem>
                    <MenuItem value="Employee">Funcionário</MenuItem>
                  </Select>
                  {errors.employeeType && (
                    <FormHelperText>{errors.employeeType.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <TextField
              {...register('position')}
              label="Cargo"
              fullWidth
              error={!!errors.position}
              helperText={errors.position?.message}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              {...register('salary')}
              label="Salário"
              type="number"
              fullWidth
              error={!!errors.salary}
              helperText={errors.salary?.message}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                },
              }}
            />
            <TextField
              {...register('phone')}
              label="Telefone"
              fullWidth
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="edit-employee-form"
          variant="contained"
          color="success"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : <SaveRounded />}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
