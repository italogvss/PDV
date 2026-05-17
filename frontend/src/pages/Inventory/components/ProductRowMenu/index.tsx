import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import TuneRounded from '@mui/icons-material/TuneRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { ProductRowMenuProps } from './types'

export default function ProductRowMenu({ product, onEdit }: ProductRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const handleClose = () => setAnchor(null)

  const handleEdit = () => {
    handleClose()
    onEdit(product)
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
        <MenuItem onClick={handleEdit}>
          <EditRounded />
          Editar produto
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <TuneRounded />
          Ajustar estoque
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={handleClose}
          sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
        >
          <DeleteOutlineRounded />
          Excluir
        </MenuItem>
      </Menu>
    </>
  )
}
