import { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useDeleteSupplier } from '../../../../hooks/useSuppliers'
import type { SupplierRowMenuProps } from './types'

function toWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export default function SupplierRowMenu({ supplier, onEdit }: SupplierRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteSupplier = useDeleteSupplier()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleClose = () => setAnchor(null)

  const handleDelete = async () => {
    setConfirmOpen(false)
    await deleteSupplier.mutateAsync(supplier.id)
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ color: 'text.disabled' }}
      >
        <MoreHorizRounded sx={{ fontSize: 18 }} />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            handleClose()
            onEdit()
          }}
        >
          <EditRounded />
          Editar
        </MenuItem>

        {supplier.phone && (
          <MenuItem
            component="a"
            href={toWhatsAppUrl(supplier.phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            sx={{ color: 'success.main', '& svg': { color: 'success.main' } }}
          >
            <WhatsAppIcon />
            WhatsApp
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            handleClose()
            setConfirmOpen(true)
          }}
          sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
        >
          <DeleteOutlineRounded />
          Excluir
        </MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle>Excluir fornecedor?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{supplier.name}</strong> será removido permanentemente. Esta ação não pode ser
            desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" size="small" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={handleDelete}
            disabled={deleteSupplier.isPending}
          >
            {deleteSupplier.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
