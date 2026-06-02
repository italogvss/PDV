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
import type { GridColDef } from '@mui/x-data-grid'
import { useSuppliers } from '../../hooks/useSuppliers'
import type { Supplier } from '../../types/supplier.types'
import SupplierRowMenu from './components/SupplierRowMenu'
import SupplierFormModal from './components/SupplierFormModal'

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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h1">Fornecedores</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {suppliers.length} fornecedor{suppliers.length !== 1 ? 'es' : ''} cadastrado{suppliers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<AddRounded />}
          onClick={() => setFormOpen(true)}
          sx={{ mt: 0.5 }}
        >
          Novo fornecedor
        </Button>
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 280 }}
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
          rowHeight={60}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          sx={(theme) => ({
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.surface.sunken,
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
            },
            '& .MuiDataGrid-columnHeader': {
              '&:focus, &:focus-within': { outline: 'none' },
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: theme.palette.text.tertiary,
              textTransform: 'uppercase',
            },
            '& .MuiDataGrid-columnSeparator': { display: 'none' },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              '&:focus, &:focus-within': { outline: 'none' },
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.surface.sunken,
            },
            '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
              borderBottom: 'none',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${theme.palette.border.subtle}`,
              minHeight: 48,
            },
            '& .MuiDataGrid-selectedRowCount': { display: 'none' },
          })}
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
