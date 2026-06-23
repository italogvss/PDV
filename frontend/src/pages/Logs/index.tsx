import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import PageHeader from '../../components/PageHeader'
import FilterTabs from '../../components/FilterTabs'
import FiltersPopover from '../../components/FiltersPopover'
import type { FilterSection } from '../../components/FiltersPopover/types'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import { useAppointmentStatusLogs, useStockMovements, usePriceHistory } from '../../hooks/useLogs'
import type { LogTab, AppointmentStatusLogRow, StockMovementRow, PriceHistoryRow } from './types'
import type { OperationModule } from '../../constants/modules'
import type { FilterTabOption } from '../../components/FilterTabs/types'

const DATE_RANGE_DAYS = [7, 30, 90] as const

interface TabDef {
  value: LogTab
  label: string
  requiredModule: OperationModule
}

const TAB_DEFS: TabDef[] = [
  { value: 'appointment-status', label: 'Status de Agendamento', requiredModule: 'appointments' },
  { value: 'stock-movement', label: 'Movimentação de Estoque', requiredModule: 'inventory' },
  { value: 'price-history', label: 'Histórico de Preços', requiredModule: 'inventory' },
]

const STATUS_COLOR: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default'> = {
  Pendente: 'warning',
  Confirmado: 'info',
  'Em atendimento': 'primary',
  'Concluído': 'success',
  Cancelado: 'error',
}

const MOVEMENT_TYPE_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  Entrada: 'success',
  'Saída (Venda)': 'error',
  Estorno: 'warning',
  'Ajuste Manual': 'default',
}

const MOVEMENT_TYPE_OPTIONS = ['Todos', 'Entrada', 'Saída (Venda)', 'Estorno', 'Ajuste Manual']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const appointmentStatusColumns: GridColDef<AppointmentStatusLogRow>[] = [
  {
    field: 'appointmentId',
    headerName: 'Agendamento',
    width: 130,
    renderCell: ({ row }) =>
      row.appointmentId ? (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          #{row.appointmentId.slice(0, 8).toUpperCase()}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.disabled">—</Typography>
      ),
  },
  {
    field: 'fromStatus',
    headerName: 'Status anterior',
    width: 160,
    renderCell: ({ row }) => (
      <Chip
        label={row.fromStatus}
        size="small"
        color={STATUS_COLOR[row.fromStatus] ?? 'default'}
        variant="outlined"
      />
    ),
  },
  {
    field: 'toStatus',
    headerName: 'Novo status',
    width: 160,
    renderCell: ({ row }) => (
      <Chip
        label={row.toStatus}
        size="small"
        color={STATUS_COLOR[row.toStatus] ?? 'default'}
      />
    ),
  },
  {
    field: 'changedByName',
    headerName: 'Alterado por',
    flex: 1,
    minWidth: 160,
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.changedByName || '—'}</Typography>
    ),
  },
  {
    field: 'changedAt',
    headerName: 'Data',
    width: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatDate(row.changedAt)}
      </Typography>
    ),
  },
]

const stockMovementColumns: GridColDef<StockMovementRow>[] = [
  {
    field: 'productName',
    headerName: 'Produto',
    flex: 1,
    minWidth: 160,
    renderCell: ({ row }) => <Typography variant="body2">{row.productName}</Typography>,
  },
  {
    field: 'typeLabel',
    headerName: 'Tipo',
    width: 150,
    renderCell: ({ row }) => (
      <Chip
        label={row.typeLabel}
        size="small"
        color={MOVEMENT_TYPE_COLOR[row.typeLabel] ?? 'default'}
        variant="outlined"
      />
    ),
  },
  {
    field: 'displayQty',
    headerName: 'Qtd.',
    width: 90,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => {
      const qty = row.displayQty
      const color = qty > 0 ? 'success.main' : qty < 0 ? 'error.main' : 'text.secondary'
      return (
        <Typography variant="body2" sx={{ fontWeight: 600, color }}>
          {qty > 0 ? `+${qty}` : qty}
        </Typography>
      )
    },
  },
  {
    field: 'unitCost',
    headerName: 'Custo unit.',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.unitCost != null ? formatBRL(row.unitCost) : '—'}
      </Typography>
    ),
  },
  {
    field: 'supplierName',
    headerName: 'Fornecedor',
    width: 160,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.supplierName || '—'}
      </Typography>
    ),
  },
  {
    field: 'note',
    headerName: 'Observação',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary" noWrap>
        {row.note || '—'}
      </Typography>
    ),
  },
  {
    field: 'createdByName',
    headerName: 'Operador',
    width: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.createdByName || '—'}</Typography>
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Data',
    width: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatDate(row.createdAt)}
      </Typography>
    ),
  },
]

const priceHistoryColumns: GridColDef<PriceHistoryRow>[] = [
  {
    field: 'entityTypeLabel',
    headerName: 'Tipo',
    width: 100,
    renderCell: ({ row }) => (
      <Chip label={row.entityTypeLabel} size="small" variant="outlined" />
    ),
  },
  {
    field: 'entityName',
    headerName: 'Nome',
    flex: 1,
    minWidth: 160,
    renderCell: ({ row }) => <Typography variant="body2">{row.entityName}</Typography>,
  },
  {
    field: 'oldPrice',
    headerName: 'Preço anterior',
    width: 140,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatBRL(row.oldPrice)}
      </Typography>
    ),
  },
  {
    field: 'newPrice',
    headerName: 'Novo preço',
    width: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatBRL(row.newPrice)}
      </Typography>
    ),
  },
  {
    field: 'delta',
    headerName: 'Variação',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => {
      const delta = row.delta
      const color = delta > 0 ? 'error.main' : delta < 0 ? 'success.main' : 'text.secondary'
      return (
        <Typography variant="body2" sx={{ fontWeight: 600, color }}>
          {delta > 0 ? `+${formatBRL(delta)}` : formatBRL(delta)}
        </Typography>
      )
    },
  },
  {
    field: 'changedByName',
    headerName: 'Alterado por',
    width: 160,
    renderCell: ({ row }) => (
      <Typography variant="body2">{row.changedByName || '—'}</Typography>
    ),
  },
  {
    field: 'changedAt',
    headerName: 'Data',
    width: 150,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatDate(row.changedAt)}
      </Typography>
    ),
  },
]

export default function LogsPage() {
  const { isModuleEnabled } = useUserPermissions()

  const availableTabs = TAB_DEFS.filter((t) => isModuleEnabled(t.requiredModule))
  const filterTabOptions: FilterTabOption[] = availableTabs.map((t) => ({
    value: t.value,
    label: t.label,
  }))

  const [activeTab, setActiveTab] = useState<LogTab>(
    () => availableTabs[0]?.value ?? 'stock-movement',
  )
  const [selectedDays, setSelectedDays] = useState<(typeof DATE_RANGE_DAYS)[number]>(30)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [movementTypeFilter, setMovementTypeFilter] = useState('Todos')

  // Sincroniza aba ativa caso o módulo seja desativado
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.value === activeTab)) {
      setActiveTab(availableTabs[0].value)
    }
  }, [availableTabs, activeTab])

  const { from, to } = useMemo(() => {
    const now = new Date()
    const start = new Date()
    start.setDate(start.getDate() - selectedDays)
    return { from: start.toISOString(), to: now.toISOString() }
  }, [selectedDays])

  const { data: appointmentLogs = [], isLoading: loadingAppointments } = useAppointmentStatusLogs(
    from,
    to,
    activeTab === 'appointment-status',
  )
  const { data: stockMovements = [], isLoading: loadingStock } = useStockMovements(
    from,
    to,
    activeTab === 'stock-movement',
  )
  const { data: priceHistory = [], isLoading: loadingPrice } = usePriceHistory(
    from,
    to,
    activeTab === 'price-history',
  )

  const isLoading = loadingAppointments || loadingStock || loadingPrice

  const rows = useMemo(() => {
    if (activeTab === 'appointment-status') return appointmentLogs
    if (activeTab === 'stock-movement') {
      return movementTypeFilter === 'Todos'
        ? stockMovements
        : stockMovements.filter((m) => m.typeLabel === movementTypeFilter)
    }
    return priceHistory
  }, [activeTab, appointmentLogs, stockMovements, priceHistory, movementTypeFilter])

  const columns = useMemo((): GridColDef[] => {
    if (activeTab === 'appointment-status') return appointmentStatusColumns as GridColDef[]
    if (activeTab === 'stock-movement') return stockMovementColumns as GridColDef[]
    return priceHistoryColumns as GridColDef[]
  }, [activeTab])

  const filterSections: FilterSection[] = useMemo(() => {
    if (activeTab !== 'stock-movement') return []
    return [
      {
        id: 'type',
        label: 'Tipo de movimentação',
        options: MOVEMENT_TYPE_OPTIONS,
        value: movementTypeFilter,
        onChange: setMovementTypeFilter,
      },
    ]
  }, [activeTab, movementTypeFilter])

  const activeFiltersCount = movementTypeFilter !== 'Todos' ? 1 : 0

  function handleTabChange(tab: string) {
    setActiveTab(tab as LogTab)
    setMovementTypeFilter('Todos')
    setFilterAnchor(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Logs" description="Histórico de alterações de status, estoque e preços.">
        <ToggleButtonGroup
          value={selectedDays}
          exclusive
          onChange={(_, v) => v != null && setSelectedDays(v)}
          size="small"
        >
          {DATE_RANGE_DAYS.map((d) => (
            <ToggleButton key={d} value={d}>
              {d} dias
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {filterSections.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<FilterListRounded />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : 'Filtros'}
          </Button>
        )}
      </PageHeader>

      {availableTabs.length === 0 ? (
        <Typography color="text.secondary">
          Nenhum módulo compatível com logs está ativo para este tenant.
        </Typography>
      ) : (
        <>
          <FilterTabs value={activeTab} onChange={handleTabChange} options={filterTabOptions} />

          <Card sx={{ overflow: 'hidden' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={isLoading}
              getRowId={(r) => r.id}
              rowHeight={56}
              disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
            />
          </Card>
        </>
      )}

      <FiltersPopover
        anchorEl={filterAnchor}
        sections={filterSections}
        onClose={() => setFilterAnchor(null)}
        onClear={() => setMovementTypeFilter('Todos')}
      />
    </Box>
  )
}
