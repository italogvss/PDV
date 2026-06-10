import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useUpdateEmployee } from '../../../../hooks/useEmployees'
import { formatPhone } from '../../../../utils/masks'
import { useTeamRoles } from '../../../../hooks/useTeamRoles'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import CurrencyField from '../../../../components/CurrencyField'
import FormModalActions from '../../../../components/FormModalActions'
import type { EditEmployeeModalProps } from './types'

const schema = z.object({
  roleId: z.string().min(1, 'Selecione um papel'),
  salary: z.number().min(0),
  phone: z.string()
    .refine(v => !v || [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido')
    .optional().or(z.literal('')),
})

type EditEmployeeForm = z.infer<typeof schema>

export default function EditEmployeeModal({ employee, open, onClose }: EditEmployeeModalProps) {
  const updateEmployee = useUpdateEmployee()
  const { data: roles, isLoading: rolesLoading } = useTeamRoles()
  const isPending = updateEmployee.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditEmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      roleId: employee.roleId,
      salary: employee.salary ?? 0,
      phone: employee.phone ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        roleId: employee.roleId,
        salary: employee.salary ?? 0,
        phone: employee.phone ?? '',
      })
    }
  }, [open, employee, reset])

  const onSubmit = async (data: EditEmployeeForm) => {
    await updateEmployee.mutateAsync({
      id: employee.id,
      payload: {
        roleId: data.roleId,
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
          <Box>
            <FieldLabel label="Papel" required />
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.roleId}>
                  <Select {...field} displayEmpty disabled={rolesLoading}>
                    <MenuItem value="" disabled>Selecione...</MenuItem>
                    {roles?.map((r) => (
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                  {errors.roleId && (
                    <FormHelperText>{errors.roleId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
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
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    placeholder="(99) 99999-9999"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
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
