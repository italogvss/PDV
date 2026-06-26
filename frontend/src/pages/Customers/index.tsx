import AddRounded from '@mui/icons-material/AddRounded'
import PeopleOutlineRounded from '@mui/icons-material/PeopleOutlineRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import {
  Avatar,
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../components/DataGridNoRowsOverlay'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers'
import type { Customer } from '../../types/customers.types'
import AddCustomerModal from './components/AddCustomerModal'
import CustomerRowMenu from './components/CustomerRowMenu'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const [addOpen, setAddOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      setAddOpen(true)
      window.history.replaceState({}, '')
    }
  }, [])
  const { data, isLoading } = useCustomers(1, 200)
  const deleteCustomer = useDeleteCustomer()

  const customers = data?.data ?? []

  const kpis = useMemo(
    () => ({ total: customers.length }),
    [customers],
  )

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = q
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email?.toLowerCase().includes(q) ?? false) ||
            (c.phone?.includes(search) ?? false) ||
            (c.document?.includes(search) ?? false),
        )
      : customers

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name, 'pt-BR')
        case 'name-desc': return b.name.localeCompare(a.name, 'pt-BR')
        default: return 0
      }
    })
  }, [customers, search, sortBy])

  const columns: GridColDef<Customer>[] = useMemo(
    () => [
      {
        field: 'whatsapp',
        headerName: '',
        width: 48,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Tooltip title={row.phone ? 'Abrir WhatsApp' : 'Sem telefone cadastrado'}>
            <span>
              <IconButton
                disabled={!row.phone}
                onClick={(e) => {
                  e.stopPropagation()
                  const phone = row.phone!.replace(/\D/g, '')
                  window.open(`https://wa.me/55${phone}`, '_blank')
                }}
                sx={{ color: '#25D366' }}
              >
                <WhatsApp sx={{ fontSize: 24 }} />
              </IconButton>
            </span>
          </Tooltip>
        ),
      },
      {
        field: 'name',
        headerName: 'Cliente',
        flex: 1,
        minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <Avatar sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(row.name)}
            </Avatar>
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name}
              </Typography>
              {row.phone && (
                <Typography variant="caption" color="text.tertiary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.phone}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        field: 'email',
        headerName: 'E-mail',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.email ? 'text.primary' : 'text.disabled'}>
            {row.email ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'document',
        headerName: 'Documento',
        width: 160,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.document ? 'text.primary' : 'text.disabled'}>
            {row.document ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'address',
        headerName: 'Localização',
        width: 180,
        sortable: false,
        renderCell: ({ row }) => {
          const loc =
            row.address?.city && row.address?.state
              ? `${row.address.city}, ${row.address.state}`
              : null
          return (
            <Typography variant="body2" color={loc ? 'text.primary' : 'text.disabled'}>
              {loc ?? '—'}
            </Typography>
          )
        },
      },
      {
        field: 'rowActions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <CustomerRowMenu
            customer={row}
            onNavigate={() => navigate(`/clientes/${row.id}`)}
            onDelete={() => deleteCustomer.mutate(row.id)}
          />
        ),
      },
    ],
    [deleteCustomer, navigate],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Clientes" description={`Você tem ${kpis.total} cadastrados`}>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setAddOpen(true)}>
          Novo cliente
        </Button>
      </PageHeader>

      <PageKpiGrid>
        <PageKpiCard
          icon={PeopleOutlineRounded}
          label="Total de clientes"
          value={kpis.total}
          badge={{ label: `${kpis.total} cadastrados`, color: 'success', icon: TrendingUpRounded }}
        />
      </PageKpiGrid>

      <Card sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar nome, e-mail, telefone ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ m: 1, width: 280, '& .MuiOutlinedInput-root': { backgroundColor: 'surface.sunken' } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ fontSize: 17, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ flex: 1 }} />

          <Select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ fontSize: 13, minWidth: 170 }}
          >
            <MenuItem value="name-asc">Nome (A → Z)</MenuItem>
            <MenuItem value="name-desc">Nome (Z → A)</MenuItem>
          </Select>
        </Box>

        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          onRowClick={(params) => navigate(`/clientes/${params.row.id}`)}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
          sx={{ cursor: 'pointer' }}
        />
      </Card>

      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  )
}
