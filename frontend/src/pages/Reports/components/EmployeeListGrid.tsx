import { Avatar, Box, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ChartCard from '../../../components/ChartCard'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import { useEmployees } from '../../../hooks/useEmployees'
import type { Employee } from '../../../types/employee.types'
import { formatBRL } from '../../../utils/currency'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function EmployeeListGrid() {
  const navigate = useNavigate()
  const { data, isLoading } = useEmployees(1, 200)

  const rows = useMemo(
    () =>
      (data?.data ?? [])
        .filter((employee) => employee.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  )

  const columns: GridColDef<Employee>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Funcionário',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%', minWidth: 0 }}>
            <Avatar src={row.avatarUrl} sx={{ width: 30, height: 30, fontSize: 12 }}>
              {initials(row.name)}
            </Avatar>
            <Typography variant="body2" noWrap>
              {row.name}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'roleName',
        headerName: 'Cargo',
        width: 140,
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
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.salary ? formatBRL(row.salary) : '—'}
          </Typography>
        ),
      },
    ],
    [],
  )

  return (
    <ChartCard
      title="Funcionários"
      subtitle="Clique em um funcionário para abrir os detalhes completos"
      info="Lista dos funcionários ativos, com cargo e salário. Clique em uma linha para abrir o perfil do funcionário."
      loading={isLoading}
      isEmpty={rows.length === 0}
      emptyText="Nenhum funcionário cadastrado."
      height={420}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        rowHeight={56}
        disableRowSelectionOnClick
        pageSizeOptions={[10]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        onRowClick={(params) => navigate(`/funcionarios/${params.row.id}`)}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        sx={{ height: 420, border: 'none', cursor: 'pointer' }}
      />
    </ChartCard>
  )
}
