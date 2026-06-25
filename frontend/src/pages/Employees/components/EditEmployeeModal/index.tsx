import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Switch,
  Typography,
  MenuItem,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useUpdateEmployee } from '../../../../hooks/useEmployees'
import { formatPhone } from '../../../../utils/masks'
import { useTeamRoles } from '../../../../hooks/useTeamRoles'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import type { EditEmployeeModalProps } from './types'

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

const schema = z.object({
  roleId: z.string().min(1, 'Selecione um papel'),
  phone: z.string()
    .refine(v => !v || [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido')
    .optional().or(z.literal('')),
  autoCreateSalaryExpense: z.boolean(),
  salary: z.number().optional(),
  paymentDay: z.number().int().optional(),
}).refine(data => !data.autoCreateSalaryExpense || (data.salary != null && data.salary > 0), {
  message: 'Informe o salário.',
  path: ['salary'],
}).refine(data => !data.autoCreateSalaryExpense || (data.paymentDay != null && data.paymentDay >= 1 && data.paymentDay <= 28), {
  message: 'Informe o dia de pagamento.',
  path: ['paymentDay'],
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
      phone: employee.phone ?? '',
      autoCreateSalaryExpense: employee.autoCreateSalaryExpense,
      salary: employee.salary ?? undefined,
      paymentDay: employee.paymentDay ?? undefined,
    },
  })

  const autoCreate = useWatch({ control, name: 'autoCreateSalaryExpense' })

  useEffect(() => {
    if (open) {
      reset({
        roleId: employee.roleId,
        phone: employee.phone ?? '',
        autoCreateSalaryExpense: employee.autoCreateSalaryExpense,
        salary: employee.salary ?? undefined,
        paymentDay: employee.paymentDay ?? undefined,
      })
    }
  }, [open, employee, reset])

  const onSubmit = async (data: EditEmployeeForm) => {
    await updateEmployee.mutateAsync({
      id: employee.id,
      payload: {
        roleId: data.roleId,
        phone: data.phone || undefined,
        autoCreateSalaryExpense: data.autoCreateSalaryExpense,
        salary: data.autoCreateSalaryExpense ? data.salary : undefined,
        paymentDay: data.autoCreateSalaryExpense ? data.paymentDay : undefined,
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
                <ChipSelect
                  options={(roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color }))}
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  loading={rolesLoading}
                  error={errors.roleId?.message}
                  size="large"
                  colorMode="fill"
                />
              )}
            />
          </Box>

          <Box>
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

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body1">Criar despesas de salário automaticamente</Typography>
            <Controller
              name="autoCreateSalaryExpense"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />
              )}
            />
          </Box>

          <Collapse in={autoCreate} unmountOnExit>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FieldLabel label="Salário (R$)" required />
                <Controller
                  name="salary"
                  control={control}
                  render={({ field }) => (
                    <CurrencyField
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      fullWidth
                      error={!!errors.salary}
                      helperText={errors.salary?.message}
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FieldLabel label="Dia de pagamento" required />
                <Controller
                  name="paymentDay"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      error={!!errors.paymentDay}
                      helperText={errors.paymentDay?.message}
                    >
                      {PAYMENT_DAYS.map((d) => (
                        <MenuItem key={d} value={d}>
                          Dia {d}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>
            </Box>
          </Collapse>
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
