import {
  AttachMoneyRounded,
  BadgeOutlined,
  CalendarMonthOutlined,
  EmailOutlined,
  EventAvailableOutlined,
  LocalOfferOutlined,
  PhoneOutlined,
} from '@mui/icons-material'
import { Box, Skeleton } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog'
import DetailProfileHeader from '../../../components/DetailProfileHeader'
import type { DetailMetaItem } from '../../../components/DetailProfileHeader/types'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import {
  useDeactivateEmployee,
  useEmployee,
  useEmployeeStats,
  useResetEmployeePassword,
  useUpdateEmployee,
} from '../../../hooks/useEmployees'
import { useTeamRoles } from '../../../hooks/useTeamRoles'
import type { Employee, UpdateEmployeePayload } from '../../../types/employee.types'
import { formatBRL } from '../../../utils/currency'
import CancellationRateKpi from './components/CancellationRateKpi'
import EmployeeAppointmentsChart from './components/EmployeeAppointmentsChart'
import EmployeeInfoCard from './components/EmployeeInfoCard'
import EmployeeSalesChart from './components/EmployeeSalesChart'
import type { EmployeeFormErrors, EmployeeFormState } from './types'
import SalaryVsRevenueCard from './components/SalaryVsRevenueCard'

function buildForm(employee: Employee): EmployeeFormState {
  return {
    roleId: employee.roleId,
    phone: employee.phone ?? '',
    autoCreateSalaryExpense: employee.autoCreateSalaryExpense,
    salary: employee.salary ?? undefined,
    paymentDay: employee.paymentDay ?? undefined,
    newPassword: '',
  }
}

function buildPayload(form: EmployeeFormState): UpdateEmployeePayload {
  return {
    roleId: form.roleId,
    phone: form.phone || undefined,
    autoCreateSalaryExpense: form.autoCreateSalaryExpense,
    salary: form.autoCreateSalaryExpense ? form.salary : undefined,
    paymentDay: form.autoCreateSalaryExpense ? form.paymentDay : undefined,
  }
}

function validate(form: EmployeeFormState): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {}
  if (form.autoCreateSalaryExpense) {
    if (!form.salary || form.salary <= 0) errors.salary = 'Informe o salário.'
    if (!form.paymentDay || form.paymentDay < 1 || form.paymentDay > 28) errors.paymentDay = 'Informe o dia de pagamento.'
  }
  if (form.newPassword) {
    if (form.newPassword.length < 8) errors.newPassword = 'A senha deve ter no mínimo 8 caracteres'
    else if (!/\d/.test(form.newPassword)) errors.newPassword = 'A senha deve conter pelo menos um número'
    else if (!/[^a-zA-Z0-9]/.test(form.newPassword)) errors.newPassword = 'A senha deve conter pelo menos um caractere especial'
  }
  return errors
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: employee, isLoading } = useEmployee(id!)
  const { data: stats, isLoading: statsLoading } = useEmployeeStats(id!)
  const { data: roles } = useTeamRoles()
  const updateEmployee = useUpdateEmployee()
  const resetPassword = useResetEmployeePassword()
  const deactivateEmployee = useDeactivateEmployee()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EmployeeFormState | null>(null)
  const [errors, setErrors] = useState<EmployeeFormErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (employee) setForm(buildForm(employee))
  }, [employee])

  const set = <K extends keyof EmployeeFormState,>(field: K) => (value: EmployeeFormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))

  const handleSave = async () => {
    if (!form || !id) return
    const validationErrors = validate(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    await updateEmployee.mutateAsync({ id, payload: buildPayload(form) })
    if (form.newPassword) {
      await resetPassword.mutateAsync({ id, newPassword: form.newPassword })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (employee) setForm(buildForm(employee))
    setErrors({})
    setIsEditing(false)
  }

  const memberSince = useMemo(
    () => (employee ? new Date(employee.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''),
    [employee],
  )

  const meta = useMemo<DetailMetaItem[]>(() => {
    if (!employee) return []
    const items: DetailMetaItem[] = [{ icon: BadgeOutlined, text: employee.roleName }]
    if (employee.email) items.push({ icon: EmailOutlined, text: employee.email })
    if (employee.phone) items.push({ icon: PhoneOutlined, text: employee.phone })
    if (memberSince) items.push({ icon: CalendarMonthOutlined, text: `Funcionário desde ${memberSince}` })
    return items
  }, [employee, memberSince])

  const avatarColor = useMemo(
    () => roles?.find((r) => r.id === employee?.roleId)?.color ?? 'primary.main',
    [roles, employee],
  )

  const ticketThisMonth =
    stats && stats.salesCountThisMonth > 0 ? stats.salesThisMonth / stats.salesCountThisMonth : 0

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={100} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}
        </Box>
        <Skeleton variant="rounded" height={360} />
      </Box>
    )
  }

  if (!employee || !form) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <DetailProfileHeader
        name={employee.name}
        avatarColor={avatarColor}
        meta={meta}
        isEditing={isEditing}
        isSaving={updateEmployee.isPending || resetPassword.isPending}
        deleteLabel="Desativar"
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
        onDeleteClick={() => setConfirmDelete(true)}
      />


      <PageKpiGrid>
        <PageKpiCard
          icon={AttachMoneyRounded}
          label="Vendas no mês"
          value={statsLoading ? '...' : formatBRL(stats?.salesThisMonth ?? 0)}
          isLoading={statsLoading}
        />
        <PageKpiCard
          icon={EventAvailableOutlined}
          label="Agendamentos no mês"
          value={statsLoading ? '...' : String(stats?.appointmentsThisMonth ?? 0)}
          isLoading={statsLoading}
        />
        <PageKpiCard
          icon={LocalOfferOutlined}
          label="Ticket médio no mês"
          value={statsLoading ? '...' : formatBRL(ticketThisMonth)}
          isLoading={statsLoading}
        />
        <CancellationRateKpi cancellation={stats?.cancellation} isLoading={statsLoading} />
      </PageKpiGrid>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 350px' } }}>
        <EmployeeInfoCard
          employee={employee}
          form={form}
          isEditing={isEditing}
          set={set}
          memberSince={memberSince}
          errors={errors}
        />
        <SalaryVsRevenueCard stats={stats} statsLoading={statsLoading} />        
      </Box>
      <EmployeeSalesChart stats={stats} statsLoading={statsLoading} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' } }}>

        <EmployeeAppointmentsChart stats={stats} statsLoading={statsLoading} />
      </Box>



      <ConfirmDialog
        open={confirmDelete}
        title="Desativar funcionário?"
        description={<><strong>{employee.name}</strong> perderá o acesso ao sistema imediatamente. Você pode reativá-lo a qualquer momento nas configurações.</>}
        confirmLabel="Desativar"
        isPending={deactivateEmployee.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deactivateEmployee.mutate(id!, { onSuccess: () => navigate('/funcionarios') })
        }}
      />
    </Box>
  )
}
