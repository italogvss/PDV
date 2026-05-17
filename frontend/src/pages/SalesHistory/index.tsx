import { useState, useMemo } from 'react'
import { Box, Typography, Button, Card } from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import { MOCK_SALES } from './mock'
import type { FilterState } from './types'
import StatusChip from './components/StatusChip'
import PaymentChip from './components/PaymentChip'
import FiltersPopover from './components/FiltersPopover'
import RowActionsMenu from './components/RowActionsMenu'

const INITIAL_FILTERS: FilterState = {
  status: 'Todos',
  payment: 'Todos',
  operator: 'Todos',
}

// Definido fora para evitar recriação em cada render
const columns: GridColDef[] = [
  {
    field: 'id',
    headerName: 'Pedido',
    width: 110,
    renderCell: ({ row }) => (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {row.id}
        </Typography>
        <Typography variant="caption" color="text.tertiary">
          {row.time}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'customer',
    headerName: 'Cliente',
    flex: 1,
    minWidth: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.customer}</Typography>
    ),
  },
  {
    field: 'operator',
    headerName: 'Operador',
    width: 130,
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.operator}</Typography>
    ),
  },
  {
    field: 'items',
    headerName: 'Itens',
    width: 80,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.items}</Typography>
    ),
  },
  {
    field: 'payment',
    headerName: 'Pagamento',
    width: 160,
    sortable: false,
    renderCell: ({ row }) => <PaymentChip method={row.payment} />,
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatBRL(row.total)}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    sortable: false,
    renderCell: ({ row }) => <StatusChip status={row.status} />,
  },
  {
    field: 'rowActions',
    headerName: '',
    width: 56,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: ({ row }) => <RowActionsMenu sale={row} />,
  },
]

export default function SalesHistoryPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)

  const operators = useMemo(
    () => [...new Set(MOCK_SALES.map((s) => s.operator))],
    [],
  )

  const activeFiltersCount = useMemo(
    () =>
      [filters.status, filters.payment, filters.operator].filter(
        (v) => v !== 'Todos',
      ).length,
    [filters],
  )

  const rows = useMemo(
    () =>
      MOCK_SALES.filter(
        (row) =>
          (filters.status === 'Todos' || row.status === filters.status) &&
          (filters.payment === 'Todos' || row.payment === filters.payment) &&
          (filters.operator === 'Todos' || row.operator === filters.operator),
      ),
    [filters],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho da página */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h1">Vendas</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Histórico completo de pedidos
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListRounded />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            {activeFiltersCount > 0
              ? `Filtros (${activeFiltersCount})`
              : 'Filtros'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
          >
            Exportar
          </Button>
        </Box>
      </Box>

      {/* Tabela */}
      <Card sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowHeight={60}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={(theme) => ({
            border: 'none',
            // Cabeçalho
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
            // Células
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              '&:focus, &:focus-within': { outline: 'none' },
            },
            // Linhas
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.surface.sunken,
            },
            '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
              borderBottom: 'none',
            },
            // Rodapé / paginação
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.border.subtle}`,
              minHeight: 48,
            },
            '& .MuiDataGrid-selectedRowCount': { display: 'none' },
          })}
        />
      </Card>

      <FiltersPopover
        anchorEl={filterAnchor}
        filters={filters}
        operators={operators}
        onClose={() => setFilterAnchor(null)}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
      />
    </Box>
  )
}
