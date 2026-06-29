import { Box, Card, CardContent, Chip, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../components/DataGridNoRowsOverlay'
import type { GridColDef } from '@mui/x-data-grid'
import type { CustomerCrmStats, CustomerRecentSale } from '../../../../services/customer.service'
import { formatBRL } from '../../../../utils/currency'
import { PAYMENT_COLORS } from './helpers'
import { PAYMENT_METHOD_LABELS } from '../../../../constants/payment'

const salesColumns: GridColDef<CustomerRecentSale>[] = [
  {
    field: 'shortId',
    headerName: 'Pedido',
    width: 110,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>#{row.shortId}</Typography>
        <Typography variant="caption" color="text.tertiary">
          {new Date(row.createdAt).toLocaleDateString('pt-BR')}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'itemsSummary',
    headerName: 'Itens',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary" noWrap>{row.itemsSummary}</Typography>
    ),
  },
  {
    field: 'paymentMethod',
    headerName: 'Forma',
    width: 110,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Chip label={PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}/>
      </Box>
    ),
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 100,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatBRL(row.total)}</Typography>
    ),
  },
]

interface Props {
  stats: CustomerCrmStats | undefined
  statsLoading: boolean
}

export default function CustomerRecentSales({ stats, statsLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflowY: 'auto', maxHeight: 390 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Compras recentes</Typography>
          {stats && (
            <Typography variant="caption" color="text.secondary">
              {stats.totalSales} {stats.totalSales === 1 ? 'transação registrada' : 'transações registradas'}
            </Typography>
          )}
        </Box>
      </CardContent>
      <DataGrid
        rows={stats?.recentSales ?? []}
        columns={salesColumns}
        getRowId={(r) => r.id}
        rowHeight={56}
        disableRowSelectionOnClick
        hideFooter
        loading={statsLoading}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        sx={{
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          minHeight: 200,
        }}
      />
    </Card>
  )
}
