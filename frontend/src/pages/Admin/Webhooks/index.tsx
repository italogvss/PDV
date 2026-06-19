import { useState, useMemo } from 'react'
import {
  Box,
  Card,
  Chip,
  MenuItem,
  Select,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import PageHeader from '../../../components/PageHeader'
import { useAdminWebhooks } from '../../../hooks/useAdmin'
import type { WebhookEventRow } from '../../../services/admin.service'

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  Processed: 'success',
  Failed: 'error',
  Received: 'default',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export default function AdminWebhooksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useAdminWebhooks({ page: 1, pageSize: 200 })
  const rows = data?.data ?? []

  const filtered = useMemo(() => {
    let list = rows
    if (statusFilter) list = list.filter((r) => r.status === statusFilter)
    if (search)
      list = list.filter(
        (r) =>
          r.eventType.toLowerCase().includes(search.toLowerCase()) ||
          r.eventId.toLowerCase().includes(search.toLowerCase()),
      )
    return list
  }, [rows, statusFilter, search])

  const columns: GridColDef<WebhookEventRow>[] = useMemo(
    () => [
      { field: 'eventType', headerName: 'Tipo', flex: 1, minWidth: 220 },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Chip
            label={row.status}
            size="small"
            color={STATUS_COLORS[row.status] ?? 'default'}
          />
        ),
      },
      { field: 'provider', headerName: 'Provider', width: 120 },
      {
        field: 'receivedAt',
        headerName: 'Recebido em',
        width: 180,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.receivedAt)}</Typography>,
      },
      {
        field: 'processedAt',
        headerName: 'Processado em',
        width: 180,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.processedAt)}</Typography>,
      },
      {
        field: 'error',
        headerName: 'Erro',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.error ? 'error.main' : 'text.disabled'}>
            {row.error ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'eventId',
        headerName: 'Event ID',
        width: 140,
        renderCell: ({ row }) => (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {row.eventId.slice(0, 12)}…
          </Typography>
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Webhook Events"
        description={`${data?.totalCount ?? 0} eventos registrados`}
      />

      <Card sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar tipo ou event ID..."
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
          <Select
            size="small"
            displayEmpty
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="">Todos os status</MenuItem>
            <MenuItem value="Processed">Processed</MenuItem>
            <MenuItem value="Failed">Failed</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
          </Select>
        </Box>

        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={52}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ border: 0 }}
        />
      </Card>
    </Box>
  )
}
