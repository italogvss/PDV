import { useMemo, useState } from 'react'
import { Box, Card, Chip, MenuItem, Select, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import dayjs from 'dayjs'
import DataGridNoRowsOverlay from '../../../../../components/DataGridNoRowsOverlay'
import GridToolbar from '../../../../components/GridToolbar'
import StatusChip from '../../../../components/StatusChip'
import { DELETION_PATH_LABEL, DELETION_SCOPE, DELETION_STATUS } from '../../../../constants/statusMeta'
import { formatDate, formatDateTime } from '../../../../utils/format'
import { useAdminAccountDeletions } from '../../../../hooks/useAdmin'
import type { AdminAccountDeletion } from '../../../../types/admin.types'

const STATUS_OPTIONS = ['all', ...Object.keys(DELETION_STATUS)]

// Dias que faltam para a carência vencer (quando ainda está correndo).
function daysLeft(iso: string): number {
  return dayjs(iso).startOf('day').diff(dayjs().startOf('day'), 'day')
}

export default function DeletionsGrid() {
  const { data = [], isLoading } = useAdminAccountDeletions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return data.filter(
      (d) => (statusFilter === 'all' || d.status === statusFilter) && (!q || d.userEmail.toLowerCase().includes(q)),
    )
  }, [data, search, statusFilter])

  const columns: GridColDef<AdminAccountDeletion>[] = useMemo(
    () => [
      {
        field: 'userEmail',
        headerName: 'Titular',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Typography variant="body2" noWrap>
            {row.userEmail}
          </Typography>
        ),
      },
      {
        field: 'scope',
        headerName: 'Abrangência',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={DELETION_SCOPE} value={row.scope} />,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={DELETION_STATUS} value={row.status} />,
      },
      {
        field: 'path',
        headerName: 'Início',
        width: 140,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {DELETION_PATH_LABEL[row.path] ?? row.path}
          </Typography>
        ),
      },
      {
        field: 'requestedAt',
        headerName: 'Solicitada',
        width: 140,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.requestedAt)}
          </Typography>
        ),
      },
      {
        field: 'scheduledDeletionAt',
        headerName: 'Carência vence',
        width: 160,
        renderCell: ({ row }) => {
          // Só faz sentido contar o prazo enquanto o pedido está de pé.
          const pending = row.status === 'Requested'
          const left = daysLeft(row.scheduledDeletionAt)
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(row.scheduledDeletionAt)}
              </Typography>
              {pending && (
                <Typography variant="caption" color={left <= 7 ? 'error.main' : 'text.tertiary'}>
                  {left >= 0 ? `faltam ${left} dia(s)` : 'vencida'}
                </Typography>
              )}
            </Box>
          )
        },
      },
      {
        field: 'effectedAt',
        headerName: 'Efetivada',
        width: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.effectedAt)}
          </Typography>
        ),
      },
      {
        field: 'purgeAfter',
        headerName: 'Expurgo (legal hold)',
        width: 160,
        renderCell: ({ row }) => (
          <Tooltip title={row.purgeAfter ? 'Fim da guarda fiscal de 5 anos' : 'Definido quando a exclusão é efetivada'}>
            <Typography variant="body2" color="text.secondary">
              {formatDate(row.purgeAfter)}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'flags',
        headerName: 'Assinatura',
        width: 170,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {row.subscriptionCanceled && <Chip label="Cancelada" size="small" variant="outlined" />}
            {row.refundRequested && <Chip label="Estorno" size="small" color="warning" variant="outlined" />}
            {!row.subscriptionCanceled && !row.refundRequested && (
              <Typography variant="body2" color="text.disabled">
                —
              </Typography>
            )}
          </Box>
        ),
      },
    ],
    [],
  )

  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar pelo e-mail do titular...">
        <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 160 }}>
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === 'all' ? 'Todos os status' : DELETION_STATUS[opt].label}
            </MenuItem>
          ))}
        </Select>
      </GridToolbar>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        rowHeight={60}
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
      />
    </Card>
  )
}
