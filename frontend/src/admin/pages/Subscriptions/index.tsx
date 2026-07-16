import { useMemo, useState } from 'react'
import { Box, Card, Chip, MenuItem, Select, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import GridToolbar from '../../components/GridToolbar'
import StatusChip from '../../components/StatusChip'
import UserCell from '../../components/UserCell'
import { SUBSCRIPTION_STATUS } from '../../constants/statusMeta'
import { formatDate, formatDateTime } from '../../utils/format'
import { useAdminSubscriptions } from '../../hooks/useAdmin'
import type { AdminSubscription } from '../../types/admin.types'

const STATUS_OPTIONS = ['all', ...Object.keys(SUBSCRIPTION_STATUS)]

export default function AdminSubscriptionsPage() {
  const { data = [], isLoading } = useAdminSubscriptions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return data.filter(
      (s) =>
        (statusFilter === 'all' || s.status === statusFilter) &&
        (!q ||
          s.userEmail.toLowerCase().includes(q) ||
          s.userName.toLowerCase().includes(q) ||
          s.planName.toLowerCase().includes(q)),
    )
  }, [data, search, statusFilter])

  const columns: GridColDef<AdminSubscription>[] = useMemo(
    () => [
      {
        field: 'userName',
        headerName: 'Usuário',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => <UserCell name={row.userName} email={row.userEmail} />,
      },
      { field: 'planName', headerName: 'Plano', width: 170 },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: ({ row }) => <StatusChip map={SUBSCRIPTION_STATUS} value={row.status} />,
      },
      {
        field: 'isRenewable',
        headerName: 'Renova',
        width: 100,
        renderCell: ({ row }) => (
          <Chip
            label={row.isRenewable ? 'Sim' : 'Não'}
            size="small"
            variant="outlined"
            color={row.isRenewable ? 'success' : 'default'}
          />
        ),
      },
      {
        field: 'trialEndsAt',
        headerName: 'Fim do trial',
        width: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.trialEndsAt)}
          </Typography>
        ),
      },
      {
        field: 'currentPeriodEnd',
        headerName: 'Fim do período',
        width: 140,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.currentPeriodEnd)}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Criada em',
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title="Assinaturas"
        description={`${data.length} assinatura(s) na plataforma`}
        showHelp={false}
      />

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar por usuário, e-mail ou plano...">
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 160 }}>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os status' : SUBSCRIPTION_STATUS[opt].label}
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
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>
    </Box>
  )
}
