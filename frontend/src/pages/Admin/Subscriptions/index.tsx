import { useMemo } from 'react'
import { Box, Card, Chip, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import PageHeader from '../../../components/PageHeader'
import { useAdminSubscriptions } from '../../../hooks/useAdmin'
import type { SubscriptionRow } from '../../../services/admin.service'

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Active: 'success',
  Trialing: 'warning',
  Canceled: 'error',
  Expired: 'error',
  Pending: 'default',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AdminSubscriptionsPage() {
  const { data: rows = [], isLoading } = useAdminSubscriptions()

  const columns: GridColDef<SubscriptionRow>[] = useMemo(
    () => [
      {
        field: 'userEmail',
        headerName: 'Usuário',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.userEmail}
            </Typography>
          </Box>
        ),
      },
      { field: 'planName', headerName: 'Plano', width: 180 },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: ({ row }) => (
          <Chip
            label={row.status}
            size="small"
            color={STATUS_COLORS[row.status] ?? 'default'}
          />
        ),
      },
      { field: 'method', headerName: 'Método', width: 100 },
      {
        field: 'isRenewable',
        headerName: 'Renovável',
        width: 100,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.isRenewable ? 'success.main' : 'text.secondary'}>
            {row.isRenewable ? 'Sim' : 'Não'}
          </Typography>
        ),
      },
      {
        field: 'currentPeriodEnd',
        headerName: 'Fim do Período',
        width: 140,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.currentPeriodEnd)}</Typography>,
      },
      {
        field: 'gatewaySubscriptionId',
        headerName: 'Gateway Sub ID',
        width: 180,
        renderCell: ({ row }) => (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {row.gatewaySubscriptionId ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Criado em',
        width: 130,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.createdAt)}</Typography>,
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Subscriptions" description={`${rows.length} assinaturas`} />

      <Card sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ border: 0 }}
        />
      </Card>
    </Box>
  )
}
