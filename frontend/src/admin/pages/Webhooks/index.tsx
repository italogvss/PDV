import { useMemo, useState } from 'react'
import { Box, Card, MenuItem, Select, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import GridToolbar from '../../components/GridToolbar'
import StatusChip from '../../components/StatusChip'
import { WEBHOOK_STATUS } from '../../constants/statusMeta'
import { formatDateTime } from '../../utils/format'
import { useAdminWebhookEvents } from '../../hooks/useAdmin'
import type { AdminWebhookEvent } from '../../types/admin.types'

const STATUS_OPTIONS = ['all', ...Object.keys(WEBHOOK_STATUS)]

export default function AdminWebhooksPage() {
  const { data, isLoading } = useAdminWebhookEvents()
  const events = data?.data ?? []
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return events.filter(
      (e) =>
        (statusFilter === 'all' || e.status === statusFilter) &&
        (!q || e.eventType.toLowerCase().includes(q) || e.eventId.toLowerCase().includes(q)),
    )
  }, [events, search, statusFilter])

  const columns: GridColDef<AdminWebhookEvent>[] = useMemo(
    () => [
      {
        field: 'eventType',
        headerName: 'Evento',
        flex: 1,
        minWidth: 240,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {row.eventType}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              {row.eventId}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: ({ row }) => <StatusChip map={WEBHOOK_STATUS} value={row.status} />,
      },
      {
        field: 'receivedAt',
        headerName: 'Recebido',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.receivedAt)}
          </Typography>
        ),
      },
      {
        field: 'processedAt',
        headerName: 'Processado',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.processedAt)}
          </Typography>
        ),
      },
      {
        field: 'error',
        headerName: 'Erro',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) =>
          row.error ? (
            <Tooltip title={row.error}>
              <Typography variant="body2" color="error.main" noWrap>
                {row.error}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Webhooks"
        description="Eventos do gateway de pagamento — útil para depurar a integração."
        showHelp={false}
      />

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar por tipo ou id do evento...">
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 160 }}>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os status' : WEBHOOK_STATUS[opt].label}
              </MenuItem>
            ))}
          </Select>
        </GridToolbar>

        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'receivedAt', sort: 'desc' }] },
          }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>
    </Box>
  )
}
