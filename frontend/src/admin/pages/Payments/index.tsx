import { useMemo, useState } from 'react'
import { Box, Card, IconButton, MenuItem, Select, Tooltip, Typography } from '@mui/material'
import { PaidOutlined, ReceiptLongOutlined, ReplayOutlined, WarningAmberOutlined } from '@mui/icons-material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import GridToolbar from '../../components/GridToolbar'
import StatusChip from '../../components/StatusChip'
import UserCell from '../../components/UserCell'
import { PAYMENT_STATUS } from '../../constants/statusMeta'
import { formatCents } from '../../../utils/currency'
import { formatDateTime } from '../../utils/format'
import { useAdminPayments } from '../../hooks/useAdmin'
import type { AdminPayment } from '../../types/admin.types'

const STATUS_OPTIONS = ['all', ...Object.keys(PAYMENT_STATUS)]

export default function AdminPaymentsPage() {
  const { data = [], isLoading } = useAdminPayments()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const kpis = useMemo(() => {
    const paid = data.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + p.amountCents, 0)
    const refunded = data.filter((p) => p.status === 'Refunded').reduce((sum, p) => sum + p.amountCents, 0)
    const failed = data.filter((p) => p.status === 'Failed').length
    return { paid, refunded, failed }
  }, [data])

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return data.filter(
      (p) =>
        (statusFilter === 'all' || p.status === statusFilter) &&
        (!q ||
          p.userEmail.toLowerCase().includes(q) ||
          p.userName.toLowerCase().includes(q) ||
          p.gatewayChargeId.toLowerCase().includes(q)),
    )
  }, [data, search, statusFilter])

  const columns: GridColDef<AdminPayment>[] = useMemo(
    () => [
      {
        field: 'userName',
        headerName: 'Usuário',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => <UserCell name={row.userName} email={row.userEmail} />,
      },
      {
        field: 'amountCents',
        headerName: 'Valor',
        width: 120,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCents(row.amountCents)}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={PAYMENT_STATUS} value={row.status} />,
      },
      { field: 'method', headerName: 'Método', width: 100 },
      {
        field: 'couponCode',
        headerName: 'Cupom',
        width: 120,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.couponCode ? 'text.primary' : 'text.disabled'}>
            {row.couponCode ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'paidAt',
        headerName: 'Pago em',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(row.paidAt)}
          </Typography>
        ),
      },
      {
        field: 'receiptUrl',
        headerName: 'Recibo',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Tooltip title={row.receiptUrl ? 'Abrir recibo' : 'Sem recibo'}>
            <span>
              <IconButton
                size="small"
                disabled={!row.receiptUrl}
                onClick={() => row.receiptUrl && window.open(row.receiptUrl, '_blank')}
              >
                <ReceiptLongOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Pagamentos" description={`${data.length} cobrança(s) registrada(s)`} showHelp={false} />

      <PageKpiGrid>
        <PageKpiCard icon={PaidOutlined} label="Total recebido" value={formatCents(kpis.paid)} isLoading={isLoading} />
        <PageKpiCard icon={ReplayOutlined} label="Estornado" value={formatCents(kpis.refunded)} isLoading={isLoading} />
        <PageKpiCard
          icon={WarningAmberOutlined}
          label="Cobranças falhas"
          value={kpis.failed}
          valueColor={kpis.failed > 0 ? 'error' : undefined}
          isLoading={isLoading}
        />
      </PageKpiGrid>

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar por usuário, e-mail ou cobrança...">
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 160 }}>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os status' : PAYMENT_STATUS[opt].label}
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
