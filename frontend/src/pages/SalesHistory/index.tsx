import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import { useSales, useCancelSale } from '../../hooks/useSales'
import type { SaleListItem } from '../../services/sale.service'
import type { FilterState, SaleRecord, SaleStatus, SalePaymentMethod } from './types'
import StatusChip from './components/StatusChip'
import PaymentChip from './components/PaymentChip'
import FiltersPopover from './components/FiltersPopover'
import RowActionsMenu from './components/RowActionsMenu'
import SaleDetailModal from './components/SaleDetailModal'

const INITIAL_FILTERS: FilterState = {
  status: 'Todos',
  payment: 'Todos',
  operator: 'Todos',
}

const STATUS_MAP: Record<string, SaleStatus> = {
  Active: 'Ativo',
  Cancelled: 'Cancelado',
}

const PAYMENT_MAP: Record<string, SalePaymentMethod> = {
  Cash: 'Dinheiro',
  PIX: 'Pix',
  'Credit Card': 'Crédito',
  'Debit Card': 'Débito',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapToRecord(s: SaleListItem): SaleRecord {
  return {
    id: s.id,
    time: formatTime(s.createdAt),
    customer: s.customerName ?? '—',
    operator: s.operatorName,
    payment: PAYMENT_MAP[s.paymentMethod] ?? (s.paymentMethod as SalePaymentMethod),
    total: s.total,
    status: STATUS_MAP[s.status] ?? 'Ativo',
    amountPaid: s.total,
    change: 0,
    isInstallment: s.isInstallment,
    installmentCount: s.installmentCount,
  }
}

export default function SalesHistoryPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data: salesRaw = [], isLoading } = useSales()
  const cancelSale = useCancelSale()

  const sales: SaleRecord[] = useMemo(() => salesRaw.map(mapToRecord), [salesRaw])

  const operators = useMemo(
    () => [...new Set(sales.map((s) => s.operator))],
    [sales],
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
      sales.filter(
        (row) =>
          (filters.status === 'Todos' || row.status === filters.status) &&
          (filters.payment === 'Todos' || row.payment === filters.payment) &&
          (filters.operator === 'Todos' || row.operator === filters.operator),
      ),
    [sales, filters],
  )

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Pedido',
        width: 110,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              #{row.id.slice(0, 6).toUpperCase()}
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
        minWidth: 130,
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
        renderCell: ({ row }) => (
          <RowActionsMenu
            sale={row}
            onViewDetails={setSelectedSaleId}
            onCancel={setCancelId}
          />
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtros'}
          </Button>
        </Box>
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={60}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
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

      <FiltersPopover
        anchorEl={filterAnchor}
        filters={filters}
        operators={operators}
        onClose={() => setFilterAnchor(null)}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
      />

      <SaleDetailModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        onCancel={setCancelId}
      />

      <Dialog open={cancelId !== null} onClose={() => setCancelId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar venda</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação irá cancelar a venda e devolver os itens ao estoque. Não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setCancelId(null)}>
            Voltar
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={cancelSale.isPending}
            startIcon={cancelSale.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={async () => {
              if (!cancelId) return
              await cancelSale.mutateAsync(cancelId)
              setCancelId(null)
              setSelectedSaleId(null)
            }}
          >
            {cancelSale.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
