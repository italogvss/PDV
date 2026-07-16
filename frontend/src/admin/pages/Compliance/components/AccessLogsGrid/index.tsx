import { useMemo, useState } from 'react'
import { Box, Card, MenuItem, Select, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../../components/DataGridNoRowsOverlay'
import GridToolbar from '../../../../components/GridToolbar'
import StatusChip from '../../../../components/StatusChip'
import { ACCESS_EVENT } from '../../../../constants/statusMeta'
import { formatDateTime } from '../../../../utils/format'
import { useAdminAccessLogs } from '../../../../hooks/useAdmin'
import type { AdminAccessLog } from '../../../../types/admin.types'

const EVENT_OPTIONS = ['all', ...Object.keys(ACCESS_EVENT)]

export default function AccessLogsGrid() {
  const { data, isLoading } = useAdminAccessLogs()
  const logs = data?.data ?? []
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return logs.filter(
      (l) =>
        (eventFilter === 'all' || l.event === eventFilter) &&
        (!q || l.userEmail.toLowerCase().includes(q) || (l.ipAddress?.includes(q) ?? false)),
    )
  }, [logs, search, eventFilter])

  const columns: GridColDef<AdminAccessLog>[] = useMemo(
    () => [
      {
        field: 'userEmail',
        headerName: 'Usuário',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Tooltip title={row.userEmail === '—' ? 'Usuário anonimizado ou excluído — o registro sobrevive por lei' : ''}>
            <Typography variant="body2" color={row.userEmail === '—' ? 'text.disabled' : 'text.primary'} noWrap>
              {row.userEmail}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'event',
        headerName: 'Evento',
        width: 110,
        renderCell: ({ row }) => <StatusChip map={ACCESS_EVENT} value={row.event} />,
      },
      {
        field: 'ipAddress',
        headerName: 'IP',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.ipAddress ? 'text.secondary' : 'text.disabled'}>
            {row.ipAddress ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'userAgent',
        headerName: 'Dispositivo',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Tooltip title={row.userAgent ?? ''}>
            <Typography variant="body2" color={row.userAgent ? 'text.secondary' : 'text.disabled'} noWrap>
              {row.userAgent ?? '—'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Quando',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  )

  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar por e-mail ou IP...">
        <Select size="small" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 150 }}>
          {EVENT_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'all' ? 'Todos os eventos' : ACCESS_EVENT[opt].label}
            </MenuItem>
          ))}
        </Select>
      </GridToolbar>

      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.tertiary">
          Registros de acesso (Marco Civil, art. 15) — guarda mínima de 6 meses. Total: {data?.totalCount ?? 0}.
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
