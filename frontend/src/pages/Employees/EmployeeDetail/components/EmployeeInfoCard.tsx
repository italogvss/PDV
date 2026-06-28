import { useState } from 'react'
import {
  AttachMoneyRounded,
  CalendarMonthOutlined,
  EmailOutlined,
  LockResetRounded,
  PhoneOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import SettingCard from '../../../../components/SettingCard'
import DetailFieldCell, { DetailFieldValue } from '../../../../components/DetailFieldCell'
import ChipSelect from '../../../../components/ChipSelect'
import CurrencyField from '../../../../components/CurrencyField'
import { useTeamRoles } from '../../../../hooks/useTeamRoles'
import { formatPhone } from '../../../../utils/masks'
import { formatBRL } from '../../../../utils/currency'
import type { Employee } from '../../../../types/employee.types'
import type { EmployeeFormState } from '../types'

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

interface Props {
  employee: Employee
  form: EmployeeFormState
  isEditing: boolean
  set: <K extends keyof EmployeeFormState>(field: K) => (value: EmployeeFormState[K]) => void
  memberSince: string
  errors: { salary?: string; paymentDay?: string; newPassword?: string }
}

export default function EmployeeInfoCard({ employee, form, isEditing, set, memberSince, errors }: Props) {
  const { data: roles, isLoading: rolesLoading } = useTeamRoles()
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const role = roles?.find((r) => r.id === employee.roleId)

  return (
    <SettingCard
      title="Dados do funcionário"
      subtitle={isEditing ? undefined : 'Clique em Editar para atualizar'}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <DetailFieldCell label="Papel" borderRight>
          {isEditing ? (
            <ChipSelect
              options={(roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color }))}
              value={form.roleId || null}
              onChange={(v) => set('roleId')(v ?? '')}
              loading={rolesLoading}
              size="large"
              colorMode="fill"
            />
          ) : (
            <Chip
              size="small"
              label={employee.roleName}
              sx={role?.color ? { bgcolor: role.color, color: 'common.white' } : undefined}
            />
          )}
        </DetailFieldCell>
        <DetailFieldCell label="E-mail">
          <DetailFieldValue value={employee.email} icon={<EmailOutlined sx={{ fontSize: 14 }} />} />
        </DetailFieldCell>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderColor: 'divider' }}>
        <DetailFieldCell label="Telefone / WhatsApp" borderRight>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={form.phone}
              onChange={(e) => set('phone')(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          ) : (
            <DetailFieldValue value={employee.phone} icon={<PhoneOutlined sx={{ fontSize: 14 }} />} />
          )}
        </DetailFieldCell>
        <DetailFieldCell label="Membro desde">
          <DetailFieldValue value={memberSince} icon={<CalendarMonthOutlined sx={{ fontSize: 14 }} />} />
        </DetailFieldCell>
      </Box>

      {/* Salário automático */}
      <Box sx={{ px: 4, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <AttachMoneyRounded sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
            Despesa de salário
          </Typography>
        </Box>

        {isEditing ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">Criar despesas de salário automaticamente</Typography>
              <Switch
                checked={form.autoCreateSalaryExpense}
                onChange={(_, v) => set('autoCreateSalaryExpense')(v)}
              />
            </Box>
            <Collapse in={form.autoCreateSalaryExpense} unmountOnExit>
              <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Salário (R$)
                  </Typography>
                  <CurrencyField
                    value={form.salary ?? 0}
                    onChange={(v) => set('salary')(v)}
                    fullWidth
                    size="small"
                    error={!!errors.salary}
                    helperText={errors.salary}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Dia de pagamento
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={form.paymentDay ?? ''}
                    onChange={(e) => set('paymentDay')(Number(e.target.value))}
                    error={!!errors.paymentDay}
                    helperText={errors.paymentDay}
                  >
                    {PAYMENT_DAYS.map((d) => (
                      <MenuItem key={d} value={d}>Dia {d}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
            </Collapse>
          </>
        ) : employee.autoCreateSalaryExpense ? (
          <Typography variant="body2">
            {formatBRL(employee.salary ?? 0)}
            {employee.paymentDay ? ` · todo dia ${employee.paymentDay}` : ''}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">Não configurada</Typography>
        )}
      </Box>

      {/* Alterar senha — somente em edição */}
      {isEditing && (
        <Box sx={{ px: 4, py: 3 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<LockResetRounded fontSize="small" />}
            onClick={() => setShowPasswordSection((v) => !v)}
          >
            {showPasswordSection ? 'Cancelar alteração de senha' : 'Alterar senha'}
          </Button>
          <Collapse in={showPasswordSection} unmountOnExit>
            <Box sx={{ mt: 1.5 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Nova senha
              </Typography>
              <TextField
                size="small"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => set('newPassword')(e.target.value)}
                error={!!errors.newPassword}
                helperText={
                  errors.newPassword ??
                  'Mínimo 8 caracteres, com número e caractere especial. O funcionário deverá trocar no próximo acesso.'
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small" tabIndex={-1}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Collapse>
        </Box>
      )}
    </SettingCard>
  )
}
