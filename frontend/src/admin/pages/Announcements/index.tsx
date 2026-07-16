import { useMemo, useState } from 'react'
import { Box, Button, Card, Chip, IconButton, Tooltip, Typography } from '@mui/material'
import { AddRounded, DeleteOutlined, EditOutlined } from '@mui/icons-material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog'
import StatusChip from '../../components/StatusChip'
import { ANNOUNCEMENT_TYPE } from '../../constants/statusMeta'
import { formatDate } from '../../utils/format'
import { useAdminAnnouncements, useDeactivateAnnouncement } from '../../hooks/useAdmin'
import type { AdminAnnouncement } from '../../types/admin.types'
import AnnouncementModal from './components/AnnouncementModal'

function targetLabel(a: AdminAnnouncement): string {
  const parts: string[] = []
  if (a.targetPlanCode) parts.push(a.targetPlanCode)
  if (a.targetRole) parts.push(a.targetRole)
  return parts.length ? parts.join(' · ') : 'Todos'
}

export default function AdminAnnouncementsPage() {
  const { data = [], isLoading } = useAdminAnnouncements()
  const deactivate = useDeactivateAnnouncement()

  const [editing, setEditing] = useState<AdminAnnouncement | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState<AdminAnnouncement | null>(null)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (a: AdminAnnouncement) => {
    setEditing(a)
    setModalOpen(true)
  }

  const columns: GridColDef<AdminAnnouncement>[] = useMemo(
    () => [
      {
        field: 'title',
        headerName: 'Título',
        flex: 1,
        minWidth: 240,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {row.title}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              {row.body}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'type',
        headerName: 'Tipo',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={ANNOUNCEMENT_TYPE} value={row.type} />,
      },
      { field: 'priority', headerName: 'Prio.', width: 70 },
      {
        field: 'target',
        headerName: 'Alvo',
        width: 140,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {targetLabel(row)}
          </Typography>
        ),
      },
      {
        field: 'publishAt',
        headerName: 'Publica',
        width: 120,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.publishAt)}
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
            <Tooltip title={row.isActive ? 'Remover' : 'Já inativo'}>
              <span>
                <IconButton size="small" disabled={!row.isActive} onClick={() => setRemoving(row)}>
                  <DeleteOutlined sx={{ fontSize: 18 }} />
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
      <PageHeader title="Anúncios" description="Avisos editoriais exibidos para os usuários no app." showHelp={false}>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>
          Novo anúncio
        </Button>
      </PageHeader>

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'priority', sort: 'desc' }] },
          }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>

      <AnnouncementModal open={modalOpen} announcement={editing} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={removing !== null}
        title="Remover anúncio"
        subtitle={removing?.title}
        description="O anúncio deixa de ser exibido para os usuários. Esta ação pode ser refeita recriando o anúncio."
        confirmLabel="Remover"
        danger
        isPending={deactivate.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          deactivate.mutate(removing.id, { onSuccess: () => setRemoving(null) })
        }}
      />
    </Box>
  )
}
