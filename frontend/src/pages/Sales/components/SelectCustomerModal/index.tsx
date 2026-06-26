import PersonAddRounded from '@mui/icons-material/PersonAddRounded'
import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  TextField,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ModalHeader from '../../../../components/ModalHeader'
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid'
import DataGridNoRowsOverlay from '../../../components/DataGridNoRowsOverlay'
import { useCustomers } from '../../../../hooks/useCustomers'
import type { SelectCustomerModalProps } from './types'

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Nome', flex: 1 },
]

export default function SelectCustomerModal({ open, onClose, onSelect }: SelectCustomerModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <ModalHeader title="Selecionar cliente" onClose={onClose} />
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            placeholder="Buscar por nome, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            autoFocus
          />
          <Tooltip title="Cadastrar novo cliente">
            <IconButton
              onClick={() => { onClose(); navigate('/clientes', { state: { openNew: true } }) }}
              sx={{ border: 1, borderColor: 'border.subtle', borderRadius: 1.5 }}
            >
              <PersonAddRounded sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
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
            slots={{ noRowsOverlay: DataGridNoRowsOverlay }}
            sx={{ cursor: 'pointer', '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
