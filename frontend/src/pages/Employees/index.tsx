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
} from '@mui/material'
import GroupRounded from '@mui/icons-material/GroupRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import DateRangeRounded from '@mui/icons-material/DateRangeRounded'
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import { MOCK_EMPLOYEES } from './mock'
import EmployeeAvatar from './components/EmployeeAvatar'
import EmployeeStatusChip from './components/EmployeeStatusChip'
import EmployeeRowMenu from './components/EmployeeRowMenu'
import AddEmployeeModal from './components/AddEmployeeModal'

const CHIP_ICON_SX = {
  '& .MuiChip-icon': {
    fontSize: '12px !important',
    color: 'inherit',
    ml: 0.75,
    mr: '-3px',
  },
}

// Columns defined outside component to avoid recreation on render
const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Funcionário',
    flex: 1,
    minWidth: 220,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <EmployeeAvatar initials={row.initials} colorKey={row.colorKey} size={34} />
        <Box sx={{ minWidth: 0, flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.tertiary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.role}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    field: 'shift',
    headerName: 'Turno',
    width: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.shift}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: ({ row }) => <EmployeeStatusChip status={row.status} />,
  },
  {
    field: 'salesToday',
    headerName: 'Vendas hoje',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {row.salesToday}
      </Typography>
    ),
  },
  {
    field: 'commission',
    headerName: 'Comissão',
    width: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatBRL(row.commission)}
      </Typography>
    ),
  },
  {
    field: 'rowActions',
    headerName: '',
    width: 56,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: ({ row }) => <EmployeeRowMenu employee={row} />,
  },
]

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const kpis = useMemo(() => {
    const total = MOCK_EMPLOYEES.length
    const onlineCount = MOCK_EMPLOYEES.filter((e) => e.status === 'Em turno').length
    const totalSales = MOCK_EMPLOYEES.reduce((sum, e) => sum + e.salesToday, 0)
    const topSeller = [...MOCK_EMPLOYEES].sort((a, b) => b.salesToday - a.salesToday)[0]
    return { total, onlineCount, totalSales, topSeller }
  }, [])

  const rows = useMemo(
    () =>
      MOCK_EMPLOYEES.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h1">Funcionários</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {MOCK_EMPLOYEES.length} membros na equipe
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<DateRangeRounded />}>
            Escalas
          </Button>
          <Button variant="outlined" size="small" startIcon={<AccessTimeOutlined />}>
            Ponto eletrônico
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
            onClick={() => setModalOpen(true)}
          >
            Adicionar
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <GroupRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1, mb: 1.5 }}>
              {kpis.total}
            </Typography>
            <Chip
              size="small"
              color="warning"
              icon={<WarningAmberRounded />}
              label="2 em férias"
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CheckCircleOutlineRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Online agora
              </Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1, mb: 1.5 }}>
              {kpis.onlineCount}
            </Typography>
            <Chip
              size="small"
              color="success"
              icon={<TrendingUpRounded />}
              label="Em turno"
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ShoppingCartOutlined sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Vendas hoje
              </Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1, mb: 1.5 }}>
              {kpis.totalSales}
            </Typography>
            <Chip
              size="small"
              color="success"
              icon={<TrendingUpRounded />}
              label="+12 vs. ontem"
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingUpRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Top vendedor
              </Typography>
            </Box>
            <Typography variant="h1" sx={{ lineHeight: 1, mb: 1.5 }}>
              {kpis.topSeller.name.split(' ')[0]}
            </Typography>
            <Chip
              size="small"
              color="success"
              icon={<TrendingUpRounded />}
              label={`${kpis.topSeller.salesToday} vendas hoje`}
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Tabela de funcionários */}
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
            sx={{ width: 260 }}
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
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={(theme) => ({
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.surface.sunken,
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
            },
            '& .MuiDataGrid-columnHeader': {
              '&:focus, &:focus-within': { outline: 'none' },
            },
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
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.surface.sunken,
            },
            '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
              borderBottom: 'none',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.border.subtle}`,
              minHeight: 48,
            },
            '& .MuiDataGrid-selectedRowCount': { display: 'none' },
          })}
        />
      </Card>

      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  )
}
