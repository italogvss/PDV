import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogContent,
  TextField,
  Checkbox,
  Tooltip,
  Avatar,
  Skeleton,
  CircularProgress,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import AddIcon from '@mui/icons-material/Add'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SettingCard from '../../../../components/SettingCard'
import ModalHeader from '../../../../components/ModalHeader'
import FormModalActions from '../../../../components/FormModalActions'
import FieldLabel from '../../../../components/FieldLabel'
import { useTeamRoles, useCreateRole, useUpdateRole, useDeactivateRole, useSetRolePermissions } from '../../../../hooks/useTeamRoles'
import { useEmployees, useDeactivateEmployee } from '../../../../hooks/useEmployees'
import type { TenantRole } from '../../../../types/employee.types'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../../../../types/employee.types'
import { DeleteOutlineOutlined } from '@mui/icons-material'
import AddEmployeeModal from '../../../Employees/components/AddEmployeeModal'

// ─── Schemas ────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(255).optional(),
})

type RoleFormValues = z.infer<typeof roleSchema>

// ─── RoleFormModal ───────────────────────────────────────────────────────────

interface RoleFormModalProps {
  open: boolean
  editRole?: TenantRole | null
  onClose: () => void
}

function RoleFormModal({ open, editRole, onClose }: RoleFormModalProps) {
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const isPending = createRole.isPending || updateRole.isPending

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      reset(editRole ? { name: editRole.name, description: editRole.description ?? '' } : { name: '', description: '' })
    }
  }, [open, editRole, reset])

  const onSubmit = (values: RoleFormValues) => {
    const payload = { name: values.name, description: values.description || undefined }
    const mutation = editRole
      ? updateRole.mutateAsync({ id: editRole.id, payload })
      : createRole.mutateAsync(payload)
    mutation.then(onClose)
  }

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <ModalHeader
        title={editRole ? 'Editar papel' : 'Novo papel'}
        subtitle={editRole ? 'Altere o nome ou descrição do papel.' : 'Crie um papel personalizado para a sua equipe.'}
        onClose={onClose}
        disabled={isPending}
      />
      <DialogContent>
        <Box
          component="form"
          id="role-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Box>
            <FieldLabel label="Nome" required />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  fullWidth
                  placeholder="ex: Supervisor"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
          </Box>
          <Box>
            <FieldLabel label="Descrição" />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="O que este papel pode fazer?"
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>
      <FormModalActions
        formId="role-form"
        onCancel={onClose}
        isPending={isPending}
        submitLabel={editRole ? 'Salvar alterações' : 'Criar papel'}
        pendingLabel="Salvando..."
      />
    </Dialog>
  )
}

// ─── TeamSection ─────────────────────────────────────────────────────────────

export default function TeamSection() {
  const { data: rolesData, isLoading: rolesLoading } = useTeamRoles()
  const { data: employeesData, isLoading: employeesLoading } = useEmployees()
  const deactivateRole = useDeactivateRole()
  const setPermissions = useSetRolePermissions()
  const deactivateEmployee = useDeactivateEmployee()

  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: TenantRole | null }>({ open: false })
  const [employeeModal, setEmployeeModal] = useState(false)

  // Estado local das permissões — espelha o estado da API, editável pelo usuário
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, string[]>>({})
  const [savingRole, setSavingRole] = useState<string | null>(null)

  useEffect(() => {
    if (rolesData) {
      const initial: Record<string, string[]> = {}
      rolesData.forEach((r) => { initial[r.id] = [...r.permissions] })
      setPendingPermissions(initial)
    }
  }, [rolesData])

  const togglePermission = (roleId: string, permission: string) => {
    setPendingPermissions((prev) => {
      const current = prev[roleId] ?? []
      return {
        ...prev,
        [roleId]: current.includes(permission)
          ? current.filter((p) => p !== permission)
          : [...current, permission],
      }
    })
  }

  const hasUnsavedChanges = (role: TenantRole) => {
    const pending = pendingPermissions[role.id] ?? []
    const original = role.permissions
    return (
      pending.length !== original.length ||
      pending.some((p) => !original.includes(p))
    )
  }

  const savePermissions = async (roleId: string) => {
    setSavingRole(roleId)
    await setPermissions.mutateAsync({ id: roleId, permissions: pendingPermissions[roleId] ?? [] })
    setSavingRole(null)
  }

  const roles = rolesData ?? []
  const employees = employeesData?.data ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Papéis */}
      <SettingCard
        title="Papéis disponíveis"
        subtitle="Gerencie os papéis da equipe e suas permissões."
        action={
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setRoleModal({ open: true, role: null })}
          >
            Novo papel
          </Button>
        }
      >
        {rolesLoading
          ? [1, 2, 3].map((i) => (
              <Box key={i} sx={{ px: 4, py: 2.5 }}>
                <Skeleton width={200} height={20} />
              </Box>
            ))
          : roles.map((role) => (
              <Box
                key={role.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 2.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 36, height: 36, borderRadius: 2, bgcolor: 'surface.raised',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <PeopleAltOutlinedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                        {role.name}
                      </Typography>
                      {role.isDefault && (
                        <Chip label="padrão" size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'surface.raised', color: 'text.tertiary' }} />
                      )}
                    </Box>
                    {role.description && (
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={`${role.memberCount} ${role.memberCount === 1 ? 'membro' : 'membros'}`}
                    size="small"
                    sx={{ bgcolor: 'surface.raised', color: 'text.secondary' }}
                  />
                  <Tooltip title="Editar papel">
                    <IconButton size="small" onClick={() => setRoleModal({ open: true, role })}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {role.memberCount === 0 && !role.isDefault && (
                    <Tooltip title="Remover papel">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deactivateRole.mutate(role.id)}
                        disabled={deactivateRole.isPending}
                      >
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            ))}
      </SettingCard>

      {/* Matriz de permissões */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Matriz de permissões
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure o que cada papel pode fazer. Salve as alterações por papel.
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.sunken' }}>
              <TableCell
                sx={{ fontWeight: 600, fontSize: 11, color: 'text.tertiary', letterSpacing: '0.06em', py: 1.5, pl: 4, borderBottom: 1, borderColor: 'border.subtle' }}
              >
                PERMISSÃO
              </TableCell>
              {rolesLoading
                ? [1, 2, 3].map((i) => (
                    <TableCell key={i} align="center" sx={{ py: 1.5, borderBottom: 1, borderColor: 'border.subtle' }}>
                      <Skeleton width={60} sx={{ mx: 'auto' }} />
                    </TableCell>
                  ))
                : roles.map((role) => (
                    <TableCell
                      key={role.id}
                      align="center"
                      sx={{ fontWeight: 600, fontSize: 11, color: 'text.tertiary', letterSpacing: '0.06em', py: 1.5, borderBottom: 1, borderColor: 'border.subtle' }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        {role.name.toUpperCase()}
                        {hasUnsavedChanges(role) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, height: 22 }}
                            onClick={() => savePermissions(role.id)}
                            disabled={savingRole === role.id}
                            startIcon={savingRole === role.id ? <CircularProgress size={10} color="inherit" /> : <SaveOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                          >
                            {savingRole === role.id ? '' : 'Salvar'}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ALL_PERMISSIONS.map((perm) => (
              <TableRow key={perm} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ color: 'text.primary', fontSize: 13, py: 1.5, pl: 4, borderColor: 'border.subtle' }}>
                  {PERMISSION_LABELS[perm]}
                </TableCell>
                {rolesLoading
                  ? [1, 2, 3].map((i) => (
                      <TableCell key={i} align="center" sx={{ py: 1.5, borderColor: 'border.subtle' }}>
                        <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto' }} />
                      </TableCell>
                    ))
                  : roles.map((role) => {
                      const checked = (pendingPermissions[role.id] ?? []).includes(perm)
                      return (
                        <TableCell key={role.id} align="center" sx={{ py: 0.5, borderColor: 'border.subtle' }}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => togglePermission(role.id, perm)}
                            sx={{ p: 0.5 }}
                          />
                        </TableCell>
                      )
                    })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Funcionários */}
      <SettingCard
        title="Funcionários"
        subtitle="Membros da equipe com acesso ao sistema."
        action={
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => setEmployeeModal(true)}
          >
            Convidar funcionário
          </Button>
        }
      >
        {employeesLoading
          ? [1, 2].map((i) => (
              <Box key={i} sx={{ px: 4, py: 2.5 }}>
                <Skeleton width={250} height={20} />
              </Box>
            ))
          : employees.length === 0
          ? (
              <Box sx={{ px: 4, py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum funcionário cadastrado ainda.
                </Typography>
              </Box>
            )
          : employees.map((employee) => (
              <Box
                key={employee.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'surface.raised', color: 'text.secondary', fontSize: 14 }}>
                    {employee.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      {employee.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {employee.email} · {employee.position}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={employee.roleName}
                    size="small"
                    sx={{ bgcolor: 'surface.raised', color: 'text.secondary' }}
                  />
                  <Tooltip title="Desativar funcionário">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deactivateEmployee.mutate(employee.id)}
                      disabled={deactivateEmployee.isPending}
                    >
                      <DeleteOutlineOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
      </SettingCard>

      {/* Modais */}
      <RoleFormModal
        open={roleModal.open}
        editRole={roleModal.role}
        onClose={() => setRoleModal({ open: false })}
      />
      <AddEmployeeModal
        open={employeeModal}
        onClose={() => setEmployeeModal(false)}
      />
    </Box>
  )
}
