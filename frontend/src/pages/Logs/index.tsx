import { useState, useMemo } from 'react'
import { Box, Card, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../components/DataGridNoRowsOverlay'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import PageHeader from '../../components/PageHeader'
import ChipSelect from '../../components/ChipSelect'
import { useAuditLogs } from '../../hooks/useLogs'
import type {
  AuditLogRow,
  AuditDetails,
  PriceChangeDetails,
  StockMovementDetails,
  AppointmentStatusDetails,
  RolePermissionsDetails,
} from '../../types/audit.types'
import {
  ACTION_LABEL,
  ACTION_COLOR,
  ENTITY_TYPE_LABEL,
  MOVEMENT_TYPE_LABEL,
  STATUS_LABEL,
  ACTION_FILTER_OPTIONS,
} from './types'
import type { ChipSelectOption } from '../../components/ChipSelect/types'

const DATE_RANGE_DAYS = [7, 30, 90] as const

// ---- Type guards dos payloads de detalhe (narrowing sem `as`) ----

function isPriceChange(d: AuditDetails): d is PriceChangeDetails {
  return d !== null && 'oldPrice' in d
}
function isStockMovement(d: AuditDetails): d is StockMovementDetails {
  return d !== null && 'type' in d && 'quantity' in d
}
function isAppointmentStatus(d: AuditDetails): d is AppointmentStatusDetails {
  return d !== null && 'fromStatus' in d
}
function isRolePermissions(d: AuditDetails): d is RolePermissionsDetails {
  return d !== null && 'before' in d && 'after' in d
}

function signedQty(d: StockMovementDetails): number {
  return d.type === 'Sale' ? -d.quantity : d.quantity // ManualAdjust já vem assinado
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailCell({ details }: { details: AuditDetails }) {
  if (isPriceChange(details)) {
    const delta = details.newPrice - details.oldPrice
    const color = delta > 0 ? 'error.main' : delta < 0 ? 'success.main' : 'text.secondary'
    return (
      <Typography variant="body2">
        <Box component="span" color="text.secondary">
          {formatBRL(details.oldPrice)}
        </Box>{' '}
        →{' '}
        <Box component="span" sx={{ fontWeight: 600, color }}>
          {formatBRL(details.newPrice)}
        </Box>
      </Typography>
    )
  }

  if (isStockMovement(details)) {
    const qty = signedQty(details)
    const color = qty > 0 ? 'success.main' : qty < 0 ? 'error.main' : 'text.secondary'
    return (
      <Typography variant="body2">
        <Box component="span" sx={{ fontWeight: 600, color }}>
          {qty > 0 ? `+${qty}` : qty}
        </Box>{' '}
        <Box component="span" color="text.secondary">
          · {MOVEMENT_TYPE_LABEL[details.type]}
        </Box>
      </Typography>
    )
  }

  if (isAppointmentStatus(details)) {
    return (
      <Typography variant="body2" color="text.secondary">
        {STATUS_LABEL[details.fromStatus] ?? details.fromStatus} →{' '}
        {STATUS_LABEL[details.toStatus] ?? details.toStatus}
      </Typography>
    )
  }

  if (isRolePermissions(details)) {
    const before = new Set(details.before)
    const after = new Set(details.after)
    const added = details.after.filter((p) => !before.has(p)).length
    const removed = details.before.filter((p) => !after.has(p)).length
    return (
      <Typography variant="body2" color="text.secondary">
        {added > 0 && (
          <Box component="span" color="success.main" sx={{ fontWeight: 600 }}>
            +{added}
          </Box>
        )}
        {added > 0 && removed > 0 && ' / '}
        {removed > 0 && (
          <Box component="span" color="error.main" sx={{ fontWeight: 600 }}>
            −{removed}
          </Box>
        )}
        {added === 0 && removed === 0 ? 'sem mudança' : ' permissões'}
      </Typography>
    )
  }

  return (
    <Typography variant="body2" color="text.disabled">
      —
    </Typography>
  )
}

const columns: GridColDef<AuditLogRow>[] = [
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
  {
    field: 'action',
    headerName: 'Ação',
    width: 200,
    renderCell: ({ row }) => (
      <Chip label={ACTION_LABEL[row.action]} size="small" color={ACTION_COLOR[row.action]} variant="outlined" />
    ),
  },
  {
    field: 'entityName',
    headerName: 'Entidade',
    flex: 1,
    minWidth: 180,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" noWrap>
          {row.entityName || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {ENTITY_TYPE_LABEL[row.entityType]}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'details',
    headerName: 'Detalhe',
    flex: 1,
    minWidth: 180,
    sortable: false,
    renderCell: ({ row }) => <DetailCell details={row.details} />,
  },
  {
    field: 'performedByName',
    headerName: 'Usuário',
    width: 170,
    renderCell: ({ row }) => <Typography variant="body2">{row.performedByName || '—'}</Typography>,
  },
]

const ACTION_CHIP_OPTIONS: ChipSelectOption[] = ACTION_FILTER_OPTIONS.filter((o) => o !== 'Todas').map((label) => ({
  id: label,
  label,
}))

export default function LogsPage() {
  const [selectedDays, setSelectedDays] = useState<(typeof DATE_RANGE_DAYS)[number]>(30)
  const [actionFilter, setActionFilter] = useState<string | null>(null)

  const { from, to } = useMemo(() => {
    const now = new Date()
    const start = new Date()
    start.setDate(start.getDate() - selectedDays)
    return { from: start.toISOString(), to: now.toISOString() }
  }, [selectedDays])

  const { data: logs = [], isLoading } = useAuditLogs({ from, to })

  const rows = useMemo(
    () => (actionFilter === null ? logs : logs.filter((l) => ACTION_LABEL[l.action] === actionFilter)),
    [logs, actionFilter],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Logs" description="Histórico de auditoria das operações do sistema.">
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
      </PageHeader>

      <ChipSelect
        options={ACTION_CHIP_OPTIONS}
        value={actionFilter}
        onChange={setActionFilter}
        nullable
        size="large"
      />

      <Card sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          rowHeight={56}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>

    </Box>
  )
}
