import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import CheckIcon from '@mui/icons-material/Check'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { DeleteOutlineOutlined } from '@mui/icons-material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEmployees } from '../../hooks/useEmployees'
import { useTeamRoles, useDeactivateRole, useSetRolePermissions } from '../../hooks/useTeamRoles'
import EmployeeAvatar from './components/EmployeeAvatar'
import PageHeader from '../../components/PageHeader'
import AddEmployeeModal from './components/AddEmployeeModal'
import EditEmployeeModal from './components/EditEmployeeModal'
import EmployeeRowMenu from './components/EmployeeRowMenu'
import RoleFormModal from './components/RoleFormModal'
import SettingCard from '../../components/SettingCard'
import type { Employee, TenantRole, Permission } from '../../types/employee.types'
import { PERMISSIONS } from '../../types/employee.types'
import { permissionToModule, type OperationModule } from '../../constants/modules'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import { useAccessMetadata } from '../../hooks/useAccessMetadata'
import type { AvatarColorKey } from './types'

const COLOR_KEYS: AvatarColorKey[] = ['purple', 'accent', 'orange', 'pink', 'blue', 'teal']

function getColorKey(name: string): AvatarColorKey {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return COLOR_KEYS[hash % COLOR_KEYS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── EmployeesPage ───────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: TenantRole | null }>({ open: false })

  const { data, isLoading } = useEmployees(1, 200)
  const employees = data?.data ?? []

  const { data: rolesData, isLoading: rolesLoading } = useTeamRoles()
  const deactivateRole = useDeactivateRole()
  const setPermissions = useSetRolePermissions()

  const { modules } = useUserPermissions()

  // Relação permissão→módulo vinda do backend (fonte única). Enquanto os metadados carregam,
  // usa o mapa local como fallback de renderização.
  const { data: accessMeta } = useAccessMetadata()
  const permToModule = useMemo<Partial<Record<Permission, OperationModule>>>(() => {
    if (!accessMeta) return permissionToModule
    const map: Partial<Record<Permission, OperationModule>> = {}
    for (const [module, perms] of Object.entries(accessMeta.modulePermissions)) {
      for (const perm of perms) map[perm] = module as OperationModule
    }
    return map
  }, [accessMeta])

  // Mostra apenas permissões de módulos ativos. Permissões sem módulo (core, ex.:
  // Funcionários) ficam sempre visíveis.
  const visiblePermissions = useMemo(
    () =>
      (Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).filter((perm) => {
        const module = permToModule[perm]
        return !module || modules.includes(module)
      }),
    [permToModule, modules],
  )

  const [pendingPermissions, setPendingPermissions] = useState<Record<string, string[]>>({})

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

  const roles = rolesData ?? []

  const anyUnsavedChanges = roles.some(hasUnsavedChanges)

  const cancelAll = () => {
    if (!rolesData) return
    const reset: Record<string, string[]> = {}
    rolesData.forEach((r) => { reset[r.id] = [...r.permissions] })
    setPendingPermissions(reset)
  }

  const saveAll = async () => {
    const dirty = roles.filter(hasUnsavedChanges)
    await Promise.all(dirty.map((r) => setPermissions.mutateAsync({ id: r.id, permissions: pendingPermissions[r.id] ?? [] })))
  }

  const managePerms = useMemo(
    () => visiblePermissions.filter((p) => !p.startsWith('View')),
    [visiblePermissions],
  )
  const viewPerms = useMemo(
    () => visiblePermissions.filter((p) => p.startsWith('View')),
    [visiblePermissions],
  )

  const toggleAllForRow = (perm: string) => {
    if (!roles.length) return
    const allHave = roles.every((r) => (pendingPermissions[r.id] ?? []).includes(perm))
    setPendingPermissions((prev) => {
      const next = { ...prev }
      roles.forEach((role) => {
        const cur = prev[role.id] ?? []
        next[role.id] = allHave ? cur.filter((p) => p !== perm) : cur.includes(perm) ? cur : [...cur, perm]
      })
      return next
    })
  }

  const toggleAllForColumn = (roleId: string) => {
    const cur = pendingPermissions[roleId] ?? []
    const allHave = visiblePermissions.every((p) => cur.includes(p))
    setPendingPermissions((prev) => {
      const roleCur = prev[roleId] ?? []
      return {
        ...prev,
        [roleId]: allHave
          ? roleCur.filter((p) => !visiblePermissions.includes(p as Permission))
          : [...new Set([...roleCur, ...visiblePermissions])],
      }
    })
  }

  const filteredRows = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [employees, search],
  )

  const columns: GridColDef<Employee>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Funcionário',
        flex: 1,
        minWidth: 240,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <EmployeeAvatar
              initials={getInitials(row.name)}
              colorKey={getColorKey(row.name)}
              size={34}
            />
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.tertiary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: 'roleName',
        headerName: 'Papel',
        width: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {row.roleName}
          </Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            color={row.isActive ? 'success' : 'default'}
            label={row.isActive ? 'Ativo' : 'Inativo'}
          />
        ),
      },
      {
        field: 'rowActions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <EmployeeRowMenu employee={row} onEdit={() => setEditEmployee(row)} />
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Funcionários" description={`${employees.length} membros na equipe`}>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>
          Novo funcionário
        </Button>
      </PageHeader>

      {/* DataGrid + Papéis lado a lado */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { xs: 'stretch', md: 'flex-start' } }}>
        {/* DataGrid */}
        <Card sx={{ overflow: 'hidden', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              flexShrink: 0,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar funcionário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ m: 1, width: 280, '& .MuiOutlinedInput-root': { backgroundColor: 'surface.sunken' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            rowHeight={64}
            loading={isLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowDoubleClick={(params) => setEditEmployee(params.row)}
          />
        </Card>

        {/* Papéis disponíveis */}
        <Box sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0 }}>
          <SettingCard
            title="Papéis disponíveis"
            subtitle="Gerencie os papéis da equipe."
            maxContentHeight={400}
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
                    <Skeleton width={160} height={20} />
                  </Box>
                ))
              : roles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 32, height: 32, borderRadius: 2,
                          bgcolor: role.color ?? 'surface.raised',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <PeopleAltOutlinedIcon sx={{ fontSize: 16, color: role.color ? 'common.white' : 'text.tertiary' }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                            {role.name}
                          </Typography>
                          {role.isDefault && (
                            <Chip label="padrão" sx={{ height: 16, bgcolor: 'surface.raised', color: 'text.tertiary' }} />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {role.memberCount} {role.memberCount === 1 ? 'membro' : 'membros'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
        </Box>
      </Box>

      {/* Matriz de permissões */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
              Matriz de permissões
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Configure o que cada papel pode fazer.
            </Typography>
          </Box>
          {anyUnsavedChanges && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" size="small" onClick={cancelAll} disabled={setPermissions.isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={setPermissions.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                onClick={saveAll}
                disabled={setPermissions.isPending}
              >
                Salvar alterações
              </Button>
            </Box>
          )}
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'surface.sunken' }}>
                {/* Row-toggle column header: no label */}
                <TableCell sx={{ py: 1.5, pl: 2, pr: 0, width: 40, borderBottom: 1, borderColor: 'border.subtle' }} />
                <TableCell
                  sx={{ py: 1.5, pl: 1, borderBottom: 1, borderColor: 'border.subtle' }}
                >
                  <Typography variant='h6' sx={{ fontWeight: 500, color: 'text.tertiary',textTransform: 'uppercase',letterSpacing: '0.06em', fontSize: '1em'}}>
                    Permissão
                  </Typography>
                </TableCell>
                {rolesLoading
                  ? [1, 2, 3].map((i) => (
                      <TableCell key={i} align="center" sx={{ py: 1.5, borderBottom: 1, borderColor: 'border.subtle' }}>
                        <Skeleton width={60} sx={{ mx: 'auto' }} />
                      </TableCell>
                    ))
                  : roles.map((role) => {
                      const allHave = visiblePermissions.every((p) => (pendingPermissions[role.id] ?? []).includes(p))
                      const someHave = visiblePermissions.some((p) => (pendingPermissions[role.id] ?? []).includes(p))
                      return (
                        <TableCell
                          key={role.id}
                          align="center"
                          sx={{ py: 1, borderBottom: 1, borderColor: 'border.subtle' }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: "1em", color: 'text.tertiary', letterSpacing: '0.06em' }}>
                              {role.name.toUpperCase()}
                            </Typography>
                            <Checkbox
                              size="small"
                              checked={allHave}
                              indeterminate={!allHave && someHave}
                              onChange={() => toggleAllForColumn(role.id)}
                              sx={{ p: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                      )
                    })}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Permissões de gerenciar */}
              {managePerms.map((perm) => {
                const allRolesHave = roles.length > 0 && roles.every((r) => (pendingPermissions[r.id] ?? []).includes(perm))
                const someRolesHave = roles.some((r) => (pendingPermissions[r.id] ?? []).includes(perm))
                return (
                  <TableRow key={perm}>
                    <TableCell align="center" sx={{ py: 0.5, pl: 2, pr: 0, borderColor: 'border.subtle' }}>
                      {rolesLoading ? (
                        <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto' }} />
                      ) : (
                        <Checkbox
                          size="small"
                          checked={allRolesHave}
                          indeterminate={!allRolesHave && someRolesHave}
                          onChange={() => toggleAllForRow(perm)}
                          sx={{ p: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: 13, py: 1.5, pl: 1, borderColor: 'border.subtle' }}>
                      {PERMISSIONS[perm]}
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
                )
              })}

              {/* Separador: Permissões de visualização */}
              {viewPerms.length > 0 && (
                <TableRow sx={{ bgcolor: 'surface.sunken' }}>
                  <TableCell sx={{ py: 1.5, pl: 2, pr: 0, borderTop: 1, borderColor: 'border.subtle' }} />
                  <TableCell
                  colSpan={999}
                  sx={{ py: 1.5, pl: 1, borderBottom: 1, borderColor: 'border.subtle' }}
                >
                  <Typography variant='h6' sx={{ fontWeight: 500, color: 'text.tertiary',textTransform: 'uppercase',letterSpacing: '0.06em', fontSize: '1em'}}>
                    Permissões de visualização
                  </Typography>
                </TableCell>
                </TableRow>
              )}

              {/* Permissões de visualizar */}
              {viewPerms.map((perm, idx) => {
                const allRolesHave = roles.length > 0 && roles.every((r) => (pendingPermissions[r.id] ?? []).includes(perm))
                return (
                  <TableRow key={perm} sx={idx === viewPerms.length - 1 ? { '& td': { border: 0 } } : undefined}>
                    <TableCell align="center" sx={{ py: 0.5, pl: 2, pr: 0, borderColor: 'border.subtle' }}>
                      {rolesLoading ? (
                        <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto' }} />
                      ) : (
                        <IconButton size="small" onClick={() => toggleAllForRow(perm)}>
                          {allRolesHave
                            ? <VisibilityIcon fontSize="small" color="secondary" />
                            : <VisibilityOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: 13, py: 1.5, pl: 1, borderColor: 'border.subtle' }}>
                      {PERMISSIONS[perm]}
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
                              <IconButton size="small" onClick={() => togglePermission(role.id, perm)}>
                                {checked
                                  ? <VisibilityIcon fontSize="small" color="secondary" />
                                  : <VisibilityOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                              </IconButton>
                            </TableCell>
                          )
                        })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} />

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          open={true}
          onClose={() => setEditEmployee(null)}
        />
      )}

      <RoleFormModal
        open={roleModal.open}
        editRole={roleModal.role}
        onClose={() => setRoleModal({ open: false })}
      />
    </Box>
  )
}
