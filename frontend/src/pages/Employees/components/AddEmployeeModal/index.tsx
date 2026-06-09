import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateEmployee } from '../../../../hooks/useEmployees'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'
import type { AddEmployeeModalProps } from './types'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  email: z.string().email('E-mail inválido'),
  temporaryPassword: z.string().min(6, 'A senha temporária deve ter no mínimo 6 caracteres'),
  employeeType: z.enum(['Manager', 'Employee']),
  position: z.string().min(1, 'Cargo é obrigatório').max(100),
  // 0 = não informado (a máscara monetária sempre devolve número).
  salary: z.number().min(0),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type AddEmployeeForm = z.infer<typeof schema>

const defaultValues: AddEmployeeForm = {
  name: '',
  email: '',
  temporaryPassword: '',
  employeeType: 'Employee',
  position: '',
  salary: 0,
  phone: '',
}

export default function AddEmployeeModal({ open, onClose }: AddEmployeeModalProps) {
  const createEmployee = useCreateEmployee()
  const isPending = createEmployee.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddEmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const onSubmit = async (data: AddEmployeeForm) => {
    await createEmployee.mutateAsync({
      name: data.name,
      email: data.email,
      temporaryPassword: data.temporaryPassword,
      employeeType: data.employeeType,
      position: data.position,
      salary: data.salary ? data.salary : undefined,
      phone: data.phone || undefined,
    })
    reset(defaultValues)
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    reset(defaultValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <ModalHeader
        title="Adicionar funcionário"
        subtitle="Cadastre um membro da equipe"
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="add-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Nome completo" required />
              <TextField
                {...register('name')}
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="E-mail" required />
              <TextField
                {...register('email')}
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel label="Senha temporária" required />
            <TextField
              {...register('temporaryPassword')}
              type="password"
              fullWidth
              error={!!errors.temporaryPassword}
              helperText={
                errors.temporaryPassword?.message ?? 'O funcionário precisará trocar no primeiro acesso'
              }
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Tipo" required />
              <Controller
                name="employeeType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.employeeType}>
                    <Select {...field}>
                      <MenuItem value="Manager">Gerente</MenuItem>
                      <MenuItem value="Employee">Funcionário</MenuItem>
                    </Select>
                    {errors.employeeType && (
                      <FormHelperText>{errors.employeeType.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Cargo" required />
              <TextField
                {...register('position')}
                fullWidth
                error={!!errors.position}
                helperText={errors.position?.message}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Salário" />
              <Controller
                name="salary"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    value={Number(field.value) || 0}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    fullWidth
                    error={!!errors.salary}
                    helperText={errors.salary?.message}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel label="Telefone" />
              <TextField
                {...register('phone')}
                fullWidth
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <FormModalActions
        formId="add-employee-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Salvar"
      />
    </Dialog>
  )
}
