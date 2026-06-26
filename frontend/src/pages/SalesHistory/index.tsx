import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import dayjs from 'dayjs'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import { useSales, useCancelSale } from '../../hooks/useSales'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import PageHeader from '../../components/PageHeader'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { FilterState, SaleRecord, SalePaymentMethod } from './types'
import { SALE_STATUS_MAP } from './types'
import StatusChip from './components/StatusChip'
import PaymentChip from './components/PaymentChip'
import FiltersPopover from './components/FiltersPopover'
import RowActionsMenu from './components/RowActionsMenu'
import SaleDetailModal from './components/SaleDetailModal'
import { SaleListItem } from '../../types/sale.types'
import { PAYMENT_METHOD_LABELS } from '../../constants/payment'

const DATE_RANGE_DAYS = [7, 14, 30, 90] as const

const INITIAL_FILTERS: FilterState = {
  status: 'Todos',
  payment: 'Todos',
  operator: 'Todos',
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
    payment: (PAYMENT_METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod) as SalePaymentMethod,
    total: s.total,
    discount: s.discount,
    status: SALE_STATUS_MAP[s.status] ?? 'Ativo',
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
  const [selectedDays, setSelectedDays] = useState(30)

  const endDateStr = dayjs().format('YYYY-MM-DD')
  const startDateStr = useMemo(
    () => dayjs().subtract(selectedDays, 'day').format('YYYY-MM-DD'),
    [selectedDays],
  )

  const { data: salesRaw = [], isLoading } = useSales(startDateStr, endDateStr)
  const cancelSale = useCancelSale()
  const { hasPermission } = useUserPermissions()
  const canCancel = hasPermission('CancelSales')

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
        width: 120,
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
            canCancel={canCancel}
            onViewDetails={setSelectedSaleId}
            onCancel={setCancelId}
          />
        ),
      },
    ],
    [canCancel],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Vendas" description="Histórico completo de vendas realizadas para o período">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selectedDays}
          onChange={(_, value) => value !== null && setSelectedDays(value)}
        >
          {DATE_RANGE_DAYS.map((days) => (
            <ToggleButton key={days} value={days}>
              {days} dias
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          startIcon={<FilterListRounded />}
          onClick={(e) => setFilterAnchor(e.currentTarget)}
        >
          {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtros'}
        </Button>
      </PageHeader>

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
          onRowDoubleClick={(params) => setSelectedSaleId(params.row.id)}          
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

      <ConfirmDialog
        open={cancelId !== null}
        title="Cancelar venda?"
        description="Esta ação irá cancelar a venda e devolver os itens ao estoque. Não pode ser desfeita."
        confirmLabel="Confirmar cancelamento"
        isPending={cancelSale.isPending}
        onClose={() => setCancelId(null)}
        onConfirm={async () => {
          if (!cancelId) return
          await cancelSale.mutateAsync(cancelId)
          setCancelId(null)
          setSelectedSaleId(null)
        }}
      />
    </Box>
  )
}
