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
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
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
import type { Employee, TenantRole } from '../../types/employee.types'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../../types/employee.types'
import type { AvatarColorKey } from './types'
import { formatBRL } from '../../utils/currency'

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
        field: 'salary',
        headerName: 'Salário',
        width: 130,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.salary != null ? formatBRL(row.salary) : '—'}
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
        <Button variant="contained" color="success" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>
          Novo funcionário
        </Button>
      </PageHeader>

      {/* DataGrid + Papéis lado a lado */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { xs: 'stretch', md: 'flex-start' } }}>
        {/* DataGrid */}
        <Card sx={{ overflow: 'hidden', flex: 1, minWidth: 0, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar funcionário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 280 }}
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

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row.id}
              rowHeight={64}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={(theme) => ({
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.surface.sunken,
                  borderBottom: `1px solid ${theme.palette.border.subtle}`,
                },
                '& .MuiDataGrid-columnHeader': { '&:focus, &:focus-within': { outline: 'none' } },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  color: theme.palette.text.tertiary,
                  textTransform: 'uppercase',
                },
                '& .MuiDataGrid-columnSeparator': { display: 'none' },
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${theme.palette.border.subtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  '&:focus, &:focus-within': { outline: 'none' },
                },
                '& .MuiDataGrid-row:hover': { backgroundColor: theme.palette.surface.sunken },
                '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': { borderBottom: 'none' },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `1px solid ${theme.palette.border.subtle}`,
                  minHeight: 48,
                },
                '& .MuiDataGrid-selectedRowCount': { display: 'none' },
              })}
            />
          )}
        </Card>

        {/* Papéis disponíveis */}
        <Box sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0 }}>
          <SettingCard
            title="Papéis disponíveis"
            subtitle="Gerencie os papéis da equipe."
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
                            <Chip label="padrão" size="small" sx={{ height: 16, fontSize: 10, bgcolor: 'surface.raised', color: 'text.tertiary' }} />
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
        <Box sx={{ px: 4, py: 3 }}>
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
            Matriz de permissões
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure o que cada papel pode fazer. Salve as alterações por papel.
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
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
