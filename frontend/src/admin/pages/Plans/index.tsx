import { useMemo, useState } from 'react'
import { Box, Card, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import { BlockOutlined, EditOutlined } from '@mui/icons-material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { formatCents } from '../../../utils/currency'
import { useAdminPlans, useDeactivatePlan } from '../../hooks/useAdmin'
import type { AdminPlan } from '../../types/admin.types'
import EditPlanModal from './components/EditPlanModal'

const BILLING_PERIOD: Record<string, { label: string; suffix: string }> = {
  Monthly: { label: 'Mensal', suffix: '/mês' },
  Annual: { label: 'Anual', suffix: '/ano' },
}

export default function AdminPlansPage() {
  const { data = [], isLoading } = useAdminPlans()
  const deactivatePlan = useDeactivatePlan()

  const [editing, setEditing] = useState<AdminPlan | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<AdminPlan | null>(null)

  const openEdit = (plan: AdminPlan) => {
    setEditing(plan)
    setEditOpen(true)
  }

  const columns: GridColDef<AdminPlan>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Plano',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              {row.description || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'priceCents',
        headerName: 'Preço',
        width: 150,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCents(row.priceCents)}
            <Box component="span" sx={{ color: 'text.tertiary', fontWeight: 400 }}>
              {BILLING_PERIOD[row.billingPeriod]?.suffix ?? ''}
            </Box>
          </Typography>
        ),
      },
      {
        field: 'billingPeriod',
        headerName: 'Ciclo',
        width: 110,
        renderCell: ({ row }) => (
          <Chip label={BILLING_PERIOD[row.billingPeriod]?.label ?? row.billingPeriod} size="small" variant="outlined" />
        ),
      },
      {
        field: 'modules',
        headerName: 'Módulos',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <Tooltip title={row.modules.join(', ') || 'Nenhum'}>
            <Chip label={`${row.modules.length} módulo(s)`} size="small" variant="outlined" />
          </Tooltip>
        ),
      },
      {
        field: 'externalProductId',
        headerName: 'Gateway',
        width: 120,
        renderCell: ({ row }) =>
          row.externalProductId ? (
            <Chip label="Configurado" size="small" color="success" variant="outlined" />
          ) : (
            <Chip label="Sem produto" size="small" color="warning" variant="outlined" />
          ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: ({ row }) => (
          <Chip
            label={row.isActive ? 'Ativo' : 'Inativo'}
            size="small"
            color={row.isActive ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 96,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => openEdit(row)}>
                <EditOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={row.isActive ? 'Desativar' : 'Já inativo'}>
              <span>
                <IconButton size="small" disabled={!row.isActive} onClick={() => setDeactivating(row)}>
                  <BlockOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Planos" description={`${data.length} plano(s) no catálogo`} showHelp={false} />

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>

      <EditPlanModal open={editOpen} plan={editing} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={deactivating !== null}
        title="Desativar plano"
        subtitle={deactivating?.name}
        description="O plano deixa de aparecer no catálogo e não poderá ser escolhido em novas assinaturas. Assinaturas atuais não são afetadas."
        confirmLabel="Desativar"
        danger
        isPending={deactivatePlan.isPending}
        onClose={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          deactivatePlan.mutate(deactivating.id, { onSuccess: () => setDeactivating(null) })
        }}
      />
    </Box>
  )
}
