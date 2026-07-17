import { useMemo, useState } from 'react'
import { Box, Button, Card, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import { AddRounded, DeleteOutlined } from '@mui/icons-material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { formatCents } from '../../../utils/currency'
import { formatDate } from '../../utils/format'
import { useAdminCoupons, useDeactivateCoupon } from '../../hooks/useAdmin'
import type { AdminCoupon } from '../../types/admin.types'
import CouponModal from './components/CouponModal'

const DURATION_LABEL: Record<string, string> = {
  once: 'Única cobrança',
  repeating: 'Recorrente',
  forever: 'Para sempre',
}

function durationLabel(c: AdminCoupon): string {
  if (c.duration === 'repeating' && c.durationInMonths) return `${c.durationInMonths} meses`
  return DURATION_LABEL[c.duration] ?? c.duration
}

function discountLabel(c: AdminCoupon): string {
  if (c.percentOff !== null) return `${c.percentOff}%`
  if (c.amountOffCents !== null) return formatCents(c.amountOffCents)
  return '—'
}

export default function AdminCouponsPage() {
  const { data = [], isLoading } = useAdminCoupons()
  const deactivate = useDeactivateCoupon()

  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState<AdminCoupon | null>(null)

  const columns: GridColDef<AdminCoupon>[] = useMemo(
    () => [
      {
        field: 'code',
        headerName: 'Código',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {row.code}
            </Typography>
            {row.name && (
              <Typography variant="caption" color="text.tertiary" noWrap>
                {row.name}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'discount',
        headerName: 'Desconto',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {discountLabel(row)}
          </Typography>
        ),
      },
      {
        field: 'duration',
        headerName: 'Duração',
        width: 140,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {durationLabel(row)}
          </Typography>
        ),
      },
      {
        field: 'redemptions',
        headerName: 'Resgates',
        width: 100,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {row.timesRedeemed}/{row.maxRedemptions ?? '∞'}
          </Typography>
        ),
      },
      {
        field: 'expiresAt',
        headerName: 'Expira',
        width: 120,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.expiresAt)}
          </Typography>
        ),
      },
      {
        field: 'active',
        headerName: 'Status',
        width: 100,
        renderCell: ({ row }) => (
          <Chip
            label={row.active ? 'Ativo' : 'Inativo'}
            size="small"
            color={row.active ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Tooltip title={row.active ? 'Remover' : 'Já inativo'}>
            <span>
              <IconButton size="small" disabled={!row.active} onClick={() => setRemoving(row)}>
                <DeleteOutlined sx={{ fontSize: 18 }} />
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
      <PageHeader title="Cupons" description="Cupons de desconto do checkout, sincronizados com o Stripe." showHelp={false}>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setModalOpen(true)}>
          Novo cupom
        </Button>
      </PageHeader>

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.promotionCodeId}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
          }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>

      <CouponModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={removing !== null}
        title="Remover cupom"
        subtitle={removing?.code}
        description="O código deixa de funcionar no checkout. Não é possível reativá-lo depois — crie um novo cupom se precisar."
        confirmLabel="Remover"
        danger
        isPending={deactivate.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          deactivate.mutate(removing.promotionCodeId, { onSuccess: () => setRemoving(null) })
        }}
      />
    </Box>
  )
}
