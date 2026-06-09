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
import { useEffect } from 'react'
import { useUpdateEmployee } from '../../../../hooks/useEmployees'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'
import type { EditEmployeeModalProps } from './types'

const schema = z.object({
  employeeType: z.enum(['Manager', 'Employee']),
  position: z.string().min(1, 'Cargo é obrigatório').max(100),
  // 0 = não informado (a máscara monetária sempre devolve número).
  salary: z.number().min(0),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type EditEmployeeForm = z.infer<typeof schema>

export default function EditEmployeeModal({ employee, open, onClose }: EditEmployeeModalProps) {
  const updateEmployee = useUpdateEmployee()
  const isPending = updateEmployee.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditEmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeType: employee.employeeType,
      position: employee.position,
      salary: employee.salary ?? 0,
      phone: employee.phone ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        employeeType: employee.employeeType,
        position: employee.position,
        salary: employee.salary ?? 0,
        phone: employee.phone ?? '',
      })
    }
  }, [open, employee, reset])

  const onSubmit = async (data: EditEmployeeForm) => {
    await updateEmployee.mutateAsync({
      id: employee.id,
      payload: {
        employeeType: data.employeeType,
        position: data.position,
        salary: data.salary ? data.salary : undefined,
        phone: data.phone || undefined,
      },
    })
    onClose()
  }

  const handleClose = () => {
    if (isPending) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <ModalHeader
        title="Editar funcionário"
        subtitle="Atualize os dados do funcionário"
        onClose={handleClose}
        disabled={isPending}
      />

      <DialogContent>
        <Box
          component="form"
          id="edit-employee-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}
        >
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
        formId="edit-employee-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Salvar alterações"
      />
    </Dialog>
  )
}
