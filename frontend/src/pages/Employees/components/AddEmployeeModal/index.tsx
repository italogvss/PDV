import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Switch,
  Typography,
  MenuItem,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateEmployee } from '../../../../hooks/useEmployees'
import { formatPhone } from '../../../../utils/masks'
import { useTeamRoles } from '../../../../hooks/useTeamRoles'
import ModalHeader from '../../../../components/ModalHeader'
import FieldLabel from '../../../../components/FieldLabel'
import FormModalActions from '../../../../components/FormModalActions'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import type { AddEmployeeModalProps } from './types'

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  username: z
    .string()
    .min(1, 'Nome de usuário é obrigatório')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Apenas letras, números, ponto e underscore'),
  email: z.string().email('E-mail inválido').max(300, 'E-mail deve ter no máximo 300 caracteres'),
  temporaryPassword: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/\d/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
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

type AddEmployeeForm = z.infer<typeof schema>

const defaultValues: AddEmployeeForm = {
  name: '',
  username: '',
  email: '',
  temporaryPassword: '',
  roleId: '',
  phone: '',
  autoCreateSalaryExpense: false,
  salary: undefined,
  paymentDay: undefined,
}

export default function AddEmployeeModal({ open, onClose }: AddEmployeeModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const createEmployee = useCreateEmployee()
  const { data: roles, isLoading: rolesLoading } = useTeamRoles()
  const isPending = createEmployee.isPending
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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

  const autoCreate = useWatch({ control, name: 'autoCreateSalaryExpense' })

  const onSubmit = async (data: AddEmployeeForm) => {
    await createEmployee.mutateAsync({
      name: data.name,
      username: data.username,
      email: data.email,
      temporaryPassword: data.temporaryPassword,
      roleId: data.roleId,
      phone: data.phone || undefined,
      autoCreateSalaryExpense: data.autoCreateSalaryExpense,
      salary: data.autoCreateSalaryExpense ? data.salary : undefined,
      paymentDay: data.autoCreateSalaryExpense ? data.paymentDay : undefined,
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
              <FieldLabel label="Nome de usuário" required />
              <TextField
                {...register('username')}
                fullWidth
                placeholder="joao.silva"
                error={!!errors.username}
                helperText={errors.username?.message ?? 'Usado para entrar no sistema'}
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel label="E-mail" required />
            <TextField
              {...register('email')}
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Box>

          <Box>
            <FieldLabel label="Senha temporária" required />
            <TextField
              {...register('temporaryPassword')}
              type={showPassword ? 'text' : 'password'}
              fullWidth
              error={!!errors.temporaryPassword}
              helperText={
                errors.temporaryPassword?.message ??
                'Mínimo 8 caracteres, com número e caractere especial. O funcionário precisará trocar no primeiro acesso.'
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

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
                <FieldLabel label="Salário" required />
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
                        <MenuItem key={d} value={d} >
                          <Typography variant='body2'> Dia {d}</Typography>
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
        formId="add-employee-form"
        onCancel={handleClose}
        isPending={isPending}
        submitLabel="Salvar"
      />
    </Dialog>
  )
}
