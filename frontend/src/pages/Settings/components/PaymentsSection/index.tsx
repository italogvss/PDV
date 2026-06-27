import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import { Box, Chip, CircularProgress, Divider, Paper, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../../components/DataGridNoRowsOverlay'
import { usePaymentHistory } from '../../../../hooks/useBilling'
import type { UserPayment } from '../../../../types/billing.types'

// --- helpers ---
function formatAmount(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatPeriod(start: string | null, end: string | null) {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return formatDate(start)
  return null
}

// --- card brand badge ---
interface BadgeBoxProps { color: string; text: string; italic?: boolean }

function BadgeBox({ color, text, italic }: BadgeBoxProps) {
  return (
    <Box sx={{
      px: 1.5, py: 0.75, borderRadius: 1, bgcolor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 52, flexShrink: 0,
    }}>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12, fontStyle: italic ? 'italic' : 'normal', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {text}
      </Typography>
    </Box>
  )
}

function CardBrandBadge({ method, brand }: { method: string; brand: string | null }) {
  if (method === 'Pix') return <BadgeBox color="#32bcad" text="PIX" />
  const b = (brand ?? '').toLowerCase()
  if (b.includes('visa')) return <BadgeBox color="#1a1f71" text="VISA" italic />
  if (b.includes('master') || b === 'mc') return <BadgeBox color="#eb5c29" text="MC" />
  if (b.includes('amex') || b.includes('american')) return <BadgeBox color="#007bc1" text="AMEX" />
  if (b.includes('elo')) return <BadgeBox color="#00a4e0" text="ELO" />
  if (b.includes('hiper')) return <BadgeBox color="#e6462e" text="HIPER" />
  return <BadgeBox color="#555" text={(brand ?? 'Card').substring(0, 4).toUpperCase()} />
}

// --- status ---
const STATUS_LABELS: Record<string, string> = {
  Paid: 'Pago',
  Pending: 'Pendente',
  Refunded: 'Reembolsado',
  Disputed: 'Contestado',
  Expired: 'Expirado',
  Cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  Paid:      { bgcolor: 'success.soft', color: 'success.ink' },
  Pending:   { bgcolor: 'warning.soft', color: 'warning.ink' },
  Refunded:  { bgcolor: 'info.soft',    color: 'info.ink' },
  Disputed:  { bgcolor: 'error.soft',   color: 'error.ink' },
  Expired:   { bgcolor: 'action.hover', color: 'text.secondary' },
  Cancelled: { bgcolor: 'action.hover', color: 'text.secondary' },
}

function StatusChip({ status }: { status: string }) {
  const sx = STATUS_COLORS[status] ?? { bgcolor: 'action.hover', color: 'text.secondary' }
  return <Chip label={STATUS_LABELS[status] ?? status} size="small" sx={{ ...sx, fontWeight: 600 }} />
}

// --- kind ---
const KIND_LABELS: Record<string, string> = {
  CardSubscription: 'Assinatura',
  PixSubscription:  'Assinatura',
  OneOffCheckout:   'Avulso',
}

// --- columns ---
const columns: GridColDef<UserPayment>[] = [
  {
    field: 'method',
    headerName: 'Método',
    flex: 1.8,
    minWidth: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
        <CardBrandBadge method={row.method} brand={row.cardBrand} />
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
            {row.method === 'Pix'
              ? 'Pagamento via PIX'
              : `•••• •••• •••• ${row.cardLastFour ?? '????'}`}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    field: 'kind',
    headerName: 'Tipo',
    width: 120,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {KIND_LABELS[row.kind] ?? row.kind}
      </Typography>
    ),
  },
  {
    field: 'amountCents',
    headerName: 'Valor',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatAmount(row.amountCents)}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    sortable: false,
    renderCell: ({ row }) => <StatusChip status={row.status} />,
  },
  {
    field: 'paidAt',
    headerName: 'Pago em',
    width: 120,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {formatDate(row.paidAt ?? row.createdAt)}
      </Typography>
    ),
  },
  {
    field: 'receiptUrl',
    headerName: '',
    width: 48,
    sortable: false,
    renderCell: ({ row }) =>
      row.receiptUrl ? (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <OpenInNewOutlined sx={{ fontSize: 16, color: 'text.tertiary' }} />
        </Box>
      ) : null,
  },
]

export default function PaymentsSection() {
  const { data, isLoading } = usePaymentHistory()
  const payments = data?.data ?? []

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 4, py: 3 }}>
        <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 600 }}>
          Histórico de cobranças
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pagamentos realizados na sua assinatura
        </Typography>
      </Box>
      <Divider />
      <DataGrid
        rows={payments}
        columns={columns}
        rowHeight={72}
        autoHeight
        disableColumnMenu
        disableRowSelectionOnClick
        getRowClassName={({ row }) => (row.receiptUrl ? 'has-receipt' : '')}
        onRowClick={({ row }) => {
          if (row.receiptUrl) window.open(row.receiptUrl, '_blank', 'noopener,noreferrer')
        }}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 25, 50]}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        sx={{
          border: 0,
          borderRadius: 0,
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.paper' },
          '& .has-receipt': { cursor: 'pointer' },
          '& .has-receipt:hover': { bgcolor: 'surface.raised' },
        }}
      />
    </Paper>
  )
}
