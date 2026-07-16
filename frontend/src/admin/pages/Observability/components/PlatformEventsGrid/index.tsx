import { useMemo, useState } from 'react'
import { Box, Card, MenuItem, Select, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../../components/DataGridNoRowsOverlay'
import GridToolbar from '../../../../components/GridToolbar'
import StatusChip from '../../../../components/StatusChip'
import { EVENT_SOURCE } from '../../../../constants/statusMeta'
import { formatDateTime } from '../../../../utils/format'
import { useAdminPlatformEvents } from '../../../../hooks/useAdmin'
import type { AdminPlatformEvent } from '../../../../types/admin.types'

const SOURCE_OPTIONS = ['all', ...Object.keys(EVENT_SOURCE)]

export default function PlatformEventsGrid() {
  const [sourceFilter, setSourceFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useAdminPlatformEvents(sourceFilter === 'all' ? undefined : sourceFilter)
  const events = data?.data ?? []

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return events
    return events.filter(
      (e) =>
        e.event.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.detail?.toLowerCase().includes(q) ?? false),
    )
  }, [events, search])

  const columns: GridColDef<AdminPlatformEvent>[] = useMemo(
    () => [
      {
        field: 'source',
        headerName: 'Origem',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={EVENT_SOURCE} value={row.source} />,
      },
      {
        field: 'event',
        headerName: 'Evento',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
            {row.event}
          </Typography>
        ),
      },
      {
        field: 'actor',
        headerName: 'Quem / origem',
        width: 220,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary" noWrap>
            {row.actor}
          </Typography>
        ),
      },
      {
        field: 'detail',
        headerName: 'Detalhe',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.detail ? 'text.secondary' : 'text.disabled'} noWrap>
            {row.detail ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'occurredAt',
        headerName: 'Quando',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.occurredAt)}
          </Typography>
        ),
      },
    ],
    [],
  )

  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar evento, autor ou detalhe...">
        <Select size="small" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 150 }}>
          {SOURCE_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'all' ? 'Todas as origens' : EVENT_SOURCE[opt].label}
            </MenuItem>
          ))}
        </Select>
      </GridToolbar>

      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.tertiary">
          Janela dos eventos recentes — acessos, webhooks do gateway e auditoria de negócio das lojas.
        </Typography>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        rowHeight={56}
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
      />
    </Card>
  )
}
