import { useMemo, useState } from 'react'
import { Box, Card, MenuItem, Select, Typography } from '@mui/material'
import { BugReportOutlined, MarkEmailUnreadOutlined, MailOutlineRounded } from '@mui/icons-material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import PageHeader from '../../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import GridToolbar from '../../components/GridToolbar'
import StatusChip from '../../components/StatusChip'
import UserCell from '../../components/UserCell'
import { CONTACT_CATEGORY, CONTACT_STATUS } from '../../constants/statusMeta'
import { formatDateTime } from '../../utils/format'
import { useAdminContactMessages } from '../../hooks/useAdmin'
import type { AdminContactMessage } from '../../types/admin.types'
import ContactDetailModal from './components/ContactDetailModal'

const CATEGORY_OPTIONS = ['all', ...Object.keys(CONTACT_CATEGORY)]
const STATUS_OPTIONS = ['all', ...Object.keys(CONTACT_STATUS)]

export default function AdminSupportPage() {
  const { data = [], isLoading } = useAdminContactMessages()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<AdminContactMessage | null>(null)

  const kpis = useMemo(
    () => ({
      total: data.length,
      unread: data.filter((m) => m.status === 'Unread').length,
      bugs: data.filter((m) => m.category === 'BugReport').length,
    }),
    [data],
  )

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return data.filter(
      (m) =>
        (categoryFilter === 'all' || m.category === categoryFilter) &&
        (statusFilter === 'all' || m.status === statusFilter) &&
        (!q ||
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.senderEmail.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q)),
    )
  }, [data, search, categoryFilter, statusFilter])

  const columns: GridColDef<AdminContactMessage>[] = useMemo(
    () => [
      {
        field: 'senderName',
        headerName: 'Remetente',
        width: 220,
        renderCell: ({ row }) => <UserCell name={row.senderName} email={row.senderEmail} />,
      },
      {
        field: 'category',
        headerName: 'Tipo',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={CONTACT_CATEGORY} value={row.category} />,
      },
      {
        field: 'subject',
        headerName: 'Assunto',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: row.status === 'Unread' ? 600 : 400 }} noWrap>
            {row.subject || '(sem assunto)'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusChip map={CONTACT_STATUS} value={row.status} />,
      },
      {
        field: 'createdAt',
        headerName: 'Recebida',
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
      <PageHeader title="Suporte" description="Mensagens de contato, sugestões e relatos de bug dos usuários." showHelp={false} />

      <PageKpiGrid>
        <PageKpiCard icon={MailOutlineRounded} label="Total" value={kpis.total} isLoading={isLoading} />
        <PageKpiCard
          icon={MarkEmailUnreadOutlined}
          label="Não lidas"
          value={kpis.unread}
          valueColor={kpis.unread > 0 ? 'warning' : undefined}
          isLoading={isLoading}
        />
        <PageKpiCard icon={BugReportOutlined} label="Bugs" value={kpis.bugs} isLoading={isLoading} />
      </PageKpiGrid>

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GridToolbar search={search} onSearch={setSearch} placeholder="Buscar assunto, corpo ou remetente...">
          <Select size="small" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 140 }}>
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os tipos' : CONTACT_CATEGORY[opt].label}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13, minWidth: 140 }}>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? 'Todos os status' : CONTACT_STATUS[opt].label}
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
          onRowClick={(params) => setSelected(params.row)}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          sx={{ cursor: 'pointer' }}
        />
      </Card>

      <ContactDetailModal message={selected} onClose={() => setSelected(null)} />
    </Box>
  )
}
