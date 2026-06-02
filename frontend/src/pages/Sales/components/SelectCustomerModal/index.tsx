import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid'
import { useCustomers } from '../../../../hooks/useCustomers'
import type { SelectCustomerModalProps } from './types'

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Nome', flex: 1 },
]

export default function SelectCustomerModal({ open, onClose, onSelect }: SelectCustomerModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useCustomers(1, 50, debouncedSearch || undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
    }
  }, [open])

  function handleRowClick(params: GridRowParams) {
    onSelect({ id: params.row.id, name: params.row.name, document: params.row.document })
    onClose()
  }

  const rows = data?.data ?? []

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Selecionar cliente</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          autoFocus
        />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Nenhum cliente encontrado.
          </Typography>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            onRowClick={handleRowClick}
            hideFooter
            disableColumnMenu
            disableRowSelectionOnClick={false}
            sx={{ cursor: 'pointer', '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
