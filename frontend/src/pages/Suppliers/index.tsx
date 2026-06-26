import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  InputAdornment,
} from '@mui/material'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { DataGrid } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../components/DataGridNoRowsOverlay'
import type { GridColDef } from '@mui/x-data-grid'
import { useSuppliers } from '../../hooks/useSuppliers'
import type { Supplier } from '../../types/supplier.types'
import SupplierRowMenu from './components/SupplierRowMenu'
import SupplierFormModal from './components/SupplierFormModal'
import PageHeader from '../../components/PageHeader'

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)

  const { data, isLoading } = useSuppliers()
  const suppliers = data?.data ?? []

  const filteredRows = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.phone ?? '').includes(search),
      ),
    [suppliers, search],
  )

  const columns: GridColDef<Supplier>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nome',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        field: 'phone',
        headerName: 'Telefone',
        width: 180,
        renderCell: ({ row }) => (
          <Typography variant="body2" color={row.phone ? 'text.primary' : 'text.disabled'}>
            {row.phone ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'rowActions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <SupplierRowMenu
            supplier={row}
            onEdit={() => setEditSupplier(row)}
          />
        ),
      },
    ],
    [],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      <PageHeader title='Fornecedores' description={`Total de fornecedores: ${suppliers.length}`}><Button
          variant="contained"
          size="small"
          startIcon={<AddRounded />}
          onClick={() => setFormOpen(true)}
          sx={{ mt: 0.5 }}
        >
          Novo fornecedor
        </Button></PageHeader>

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
            placeholder="Buscar fornecedor..."
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
        </Box>

        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          rowHeight={64}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
        />
      </Card>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <SupplierFormModal
        open={Boolean(editSupplier)}
        supplier={editSupplier}
        onClose={() => setEditSupplier(null)}
      />
    </Box>
  )
}
