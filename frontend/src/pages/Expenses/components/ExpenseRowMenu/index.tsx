import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { ExpenseRowMenuProps } from './types'

export default function ExpenseRowMenu({ expense }: ExpenseRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const handleClose = () => setAnchor(null)

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
        <MenuItem onClick={handleClose}>
          <EditRounded />
          Editar
        </MenuItem>
        {expense.status === 'Pendente' && (
          <MenuItem onClick={handleClose}>
            <CheckCircleOutlineRounded />
            Marcar como pago
          </MenuItem>
        )}
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
