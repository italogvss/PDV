import { useState, useMemo } from 'react'
import { Box, Card, Chip, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import dayjs, { type Dayjs } from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../components/DataGridNoRowsOverlay'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import PageHeader from '../../components/PageHeader'
import { useAuditLogs } from '../../hooks/useLogs'
import { useEntitlements } from '../../hooks/useSubscription'
import { PLAN_LIMITS, UNLIMITED } from '../../constants/entitlements'
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
  ACTION_TAB_OPTIONS,
  ALL_ACTIONS,
} from './types'
import FilterTabs from '../../components/FilterTabs'

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

export default function LogsPage() {
  const [actionFilter, setActionFilter] = useState<string>(ALL_ACTIONS)

  // Limite de plano: Starter (auditDays finito) só enxerga os últimos N dias — os presets 30/90
  // ficam desabilitados e os DatePickers não voltam além do teto. Pro (ilimitado) libera tudo.
  const { limit } = useEntitlements()
  const auditLimit = limit(PLAN_LIMITS.auditDays)
  const isUnlimitedAudit = auditLimit === UNLIMITED

  // Preset selecionado (destaca o ToggleButton); null = intervalo custom via DatePicker.
  const [selectedDays, setSelectedDays] = useState<number | null>(isUnlimitedAudit ? 30 : 7)
  const [rangeStart, setRangeStart] = useState<Dayjs>(() =>
    dayjs().subtract(isUnlimitedAudit ? 30 : auditLimit, 'day'),
  )
  const [rangeEnd, setRangeEnd] = useState<Dayjs>(() => dayjs())

  // Piso do intervalo no Starter — não deixa consultar além do teto de dias do plano.
  const auditFloor = isUnlimitedAudit ? null : dayjs().subtract(auditLimit, 'day')

  const applyPreset = (days: number) => {
    setSelectedDays(days)
    setRangeStart(dayjs().subtract(days, 'day'))
    setRangeEnd(dayjs())
  }

  const { from, to } = useMemo(() => {
    let start = rangeStart
    if (auditFloor && start.isBefore(auditFloor)) start = auditFloor
    return { from: start.startOf('day').toISOString(), to: rangeEnd.endOf('day').toISOString() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd, isUnlimitedAudit, auditLimit])

  const { data: logs = [], isLoading } = useAuditLogs({ from, to })

  const rows = useMemo(
    () => (actionFilter === ALL_ACTIONS ? logs : logs.filter((l) => l.action === actionFilter)),
    [logs, actionFilter],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Logs" description="Histórico de auditoria das operações do sistema.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Filtra por intervalo de dias a partir de hoje">
          <ToggleButtonGroup
            value={selectedDays}
            exclusive
            onChange={(_, v) => v != null && applyPreset(v)}
            size="small"
          >
            {DATE_RANGE_DAYS.map((d) => (
              <ToggleButton key={d} value={d} disabled={!isUnlimitedAudit && d > auditLimit}>
                {d} dias
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          </Tooltip>
          <DatePicker
            label="De"
            value={rangeStart}
            minDate={auditFloor ?? undefined}
            maxDate={rangeEnd}
            onChange={(v) => {
              if (!v) return
              setRangeStart(v)
              setSelectedDays(null)
            }}
            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
          />
          <DatePicker
            label="Até"
            value={rangeEnd}
            minDate={rangeStart}
            maxDate={dayjs()}
            onChange={(v) => {
              if (!v) return
              setRangeEnd(v)
              setSelectedDays(null)
            }}
            slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
          />
        </Box>
      </PageHeader>

      <FilterTabs options={ACTION_TAB_OPTIONS} value={actionFilter} onChange={setActionFilter} />

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
