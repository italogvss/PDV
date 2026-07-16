import { useMemo, useState } from 'react'
import { Box, Card, Chip, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import dayjs from 'dayjs'
import DataGridNoRowsOverlay from '../../../../../components/DataGridNoRowsOverlay'
import GridToolbar from '../../../../components/GridToolbar'
import { formatDate } from '../../../../utils/format'
import { useAdminRetentionTenants } from '../../../../hooks/useAdmin'
import type { AdminRetentionTenant } from '../../../../types/admin.types'

// Os dois estágios do pipeline. ScheduledDeletionAt é zerado no strip, quando LegalHoldUntil passa
// a valer — então na prática eles são mutuamente exclusivos.
function stageOf(t: AdminRetentionTenant): { label: string; color: 'warning' | 'default'; date: string | null; hint: string } {
  if (t.scheduledDeletionAt) {
    return {
      label: 'Exclusão agendada',
      color: 'warning',
      date: t.scheduledDeletionAt,
      hint: 'Quando vencer, o pipeline anonimiza e apaga o que não tem base legal.',
    }
  }
  return {
    label: 'Guarda fiscal',
    color: 'default',
    date: t.legalHoldUntil,
    hint: 'Dados fiscais/transacionais retidos por 5 anos após o strip. Vencido, tudo é expurgado.',
  }
}

export default function RetentionTenantsGrid() {
  const { data = [], isLoading } = useAdminRetentionTenants()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data
    return data.filter((t) => t.fantasyName.toLowerCase().includes(q) || t.ownerEmail.toLowerCase().includes(q))
  }, [data, search])

  const columns: GridColDef<AdminRetentionTenant>[] = useMemo(
    () => [
      {
        field: 'fantasyName',
        headerName: 'Loja',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {row.fantasyName}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              {row.ownerEmail}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'stage',
        headerName: 'Estágio',
        width: 170,
        sortable: false,
        renderCell: ({ row }) => {
          const stage = stageOf(row)
          return (
            <Tooltip title={stage.hint}>
              <Chip label={stage.label} size="small" color={stage.color} variant="outlined" />
            </Tooltip>
          )
        },
      },
      {
        field: 'deadline',
        headerName: 'Prazo',
        width: 170,
        sortable: false,
        renderCell: ({ row }) => {
          const stage = stageOf(row)
          if (!stage.date) return <Typography variant="body2" color="text.disabled">—</Typography>
          const left = dayjs(stage.date).startOf('day').diff(dayjs().startOf('day'), 'day')
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(stage.date)}
              </Typography>
              <Typography variant="caption" color={left <= 7 && left >= 0 ? 'error.main' : 'text.tertiary'}>
                {left >= 0 ? `faltam ${left} dia(s)` : 'vencido'}
              </Typography>
            </Box>
          )
        },
      },
      {
        field: 'isActive',
        headerName: 'Loja',
        width: 100,
        renderCell: ({ row }) => (
          <Chip
            label={row.isActive ? 'Ativa' : 'Inativa'}
            size="small"
            color={row.isActive ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Criada em',
        width: 130,
        renderCell: ({ row }) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  )

  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar por loja ou dono..." />

      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.tertiary">
          Lojas dentro do pipeline: exclusão agendada (por pedido ou por perda de acesso) ou em guarda fiscal.
        </Typography>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        rowHeight={60}
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
      />
    </Card>
  )
}
