import { useMemo, useState } from 'react'
import { Box, Card, Dialog, DialogContent, MenuItem, Select, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../../components/DataGridNoRowsOverlay'
import ModalHeader from '../../../../../components/ModalHeader'
import GridToolbar from '../../../../components/GridToolbar'
import StatusChip from '../../../../components/StatusChip'
import { LOG_LEVEL } from '../../../../constants/statusMeta'
import { formatDateTime } from '../../../../utils/format'
import { useAdminSystemLogs } from '../../../../hooks/useAdmin'
import type { AdminSystemLog } from '../../../../types/admin.types'

const LEVEL_OPTIONS = ['all', ...Object.keys(LOG_LEVEL)]

export default function SystemLogsGrid() {
  const [levelFilter, setLevelFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminSystemLog | null>(null)

  const { data, isLoading } = useAdminSystemLogs(levelFilter === 'all' ? undefined : levelFilter)
  const logs = data?.data ?? []

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return logs
    return logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        (l.sourceContext?.toLowerCase().includes(q) ?? false) ||
        (l.requestPath?.toLowerCase().includes(q) ?? false),
    )
  }, [logs, search])

  const columns: GridColDef<AdminSystemLog>[] = useMemo(
    () => [
      {
        field: 'level',
        headerName: 'Nível',
        width: 100,
        renderCell: ({ row }) => <StatusChip map={LOG_LEVEL} value={row.level} />,
      },
      {
        field: 'message',
        headerName: 'Mensagem',
        flex: 1,
        minWidth: 300,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" noWrap>
              {row.message}
            </Typography>
            {row.sourceContext && (
              <Typography variant="caption" color="text.tertiary" noWrap>
                {row.sourceContext}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'requestPath',
        headerName: 'Rota',
        width: 180,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.requestPath ? 'text.secondary' : 'text.disabled'} noWrap>
            {row.requestPath ?? '—'}
          </Typography>
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
    <>
      <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar mensagem, origem ou rota...">
          <Select size="small" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 150 }}>
            {LEVEL_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os níveis' : LOG_LEVEL[opt].label}
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
          onRowClick={(params) => setSelected(params.row)}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          sx={{ cursor: 'pointer' }}
        />
      </Card>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        {selected && (
          <>
            <ModalHeader
              title="Detalhe do log"
              subtitle={`${selected.sourceContext ?? 'sistema'} · ${formatDateTime(selected.createdAt)}`}
              onClose={() => setSelected(null)}
            />
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StatusChip map={LOG_LEVEL} value={selected.level} />
                {selected.requestPath && (
                  <Typography variant="caption" color="text.tertiary">
                    {selected.requestPath}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2 }}>
                {selected.message}
              </Typography>
              {selected.exception && (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'surface.sunken',
                    border: 1,
                    borderColor: 'border.subtle',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'text.secondary',
                  }}
                >
                  {selected.exception}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  )
}
