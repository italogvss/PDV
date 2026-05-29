import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  CircularProgress,
} from '@mui/material'
import GroupRounded from '@mui/icons-material/GroupRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEmployees } from '../../hooks/useEmployees'
import EmployeeAvatar from './components/EmployeeAvatar'
import AddEmployeeModal from './components/AddEmployeeModal'
import EditEmployeeModal from './components/EditEmployeeModal'
import EmployeeRowMenu from './components/EmployeeRowMenu'
import PermissionsTab from './components/PermissionsTab'
import type { Employee } from '../../types/employee.types'
import { EMPLOYEE_TYPE_LABELS } from '../../types/employee.types'
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

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)

  const { data, isLoading } = useEmployees(1, 200)
  const employees = data?.data ?? []

  const kpis = useMemo(() => {
    const total = employees.length
    const active = employees.filter((e) => e.isActive).length
    const inactive = total - active
    const managers = employees.filter((e) => e.employeeType === 'Manager').length
    return { total, active, inactive, managers }
  }, [employees])

  const filteredRows = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()) ||
          e.position.toLowerCase().includes(search.toLowerCase()),
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
            <Box sx={{ minWidth: 0, flex: 1 }}>
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
        field: 'employeeType',
        headerName: 'Tipo',
        width: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {EMPLOYEE_TYPE_LABELS[row.employeeType]}
          </Typography>
        ),
      },
      {
        field: 'position',
        headerName: 'Cargo',
        width: 160,
        renderCell: ({ row }) => (
          <Typography variant="body2">{row.position}</Typography>
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
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h1">Funcionários</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {kpis.total} membros na equipe
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<AddRounded />}
          onClick={() => setAddOpen(true)}
          sx={{ mt: 0.5 }}
        >
          Adicionar
        </Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <GroupRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">Total</Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1 }}>{kpis.total}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CheckCircleOutlineRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">Ativos</Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1 }}>{kpis.active}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BadgeOutlined sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">Gerentes</Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1 }}>{kpis.managers}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PersonOffOutlined sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">Inativos</Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1 }}>{kpis.inactive}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Equipe" />
          <Tab label="Permissões" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Card sx={{ overflow: 'hidden' }}>
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
      )}

      {tab === 1 && <PermissionsTab />}

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} />

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          open={true}
          onClose={() => setEditEmployee(null)}
        />
      )}
    </Box>
  )
}
