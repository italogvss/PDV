import { useMemo } from 'react'
import { Box, Card, Chip, Link, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import PageHeader from '../../../components/PageHeader'
import { useAdminPayments } from '../../../hooks/useAdmin'
import type { PaymentRow } from '../../../services/admin.service'

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Paid: 'success',
  Pending: 'default',
  Refunded: 'warning',
  Disputed: 'error',
  Expired: 'error',
  Cancelled: 'error',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminPaymentsPage() {
  const { data: rows = [], isLoading } = useAdminPayments()

  const columns: GridColDef<PaymentRow>[] = useMemo(
    () => [
      {
        field: 'userEmail',
        headerName: 'Usuário',
        flex: 1,
        minWidth: 180,
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
      {
        field: 'amountCents',
        headerName: 'Valor',
        width: 120,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fmtCents(row.amountCents)}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Chip label={row.status} size="small" color={STATUS_COLORS[row.status] ?? 'default'} />
        ),
      },
      { field: 'kind', headerName: 'Tipo', width: 160 },
      { field: 'method', headerName: 'Método', width: 90 },
      {
        field: 'paidAt',
        headerName: 'Pago em',
        width: 120,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.paidAt)}</Typography>,
      },
      {
        field: 'gatewayChargeId',
        headerName: 'Charge ID',
        width: 200,
        renderCell: ({ row }) => (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {row.gatewayChargeId}
          </Typography>
        ),
      },
      {
        field: 'receiptUrl',
        headerName: 'Recibo',
        width: 80,
        renderCell: ({ row }) =>
          row.receiptUrl ? (
            <Link href={row.receiptUrl} target="_blank" rel="noopener" variant="body2">
              Ver
            </Link>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'createdAt',
        headerName: 'Criado em',
        width: 120,
        renderCell: ({ row }) => <Typography variant="body2">{fmt(row.createdAt)}</Typography>,
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Pagamentos" description={`${rows.length} registros`} />

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
