import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { EmployeeRowMenuProps } from './types'

export default function EmployeeRowMenu({ employee: _ }: EmployeeRowMenuProps) {
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
          <PersonOutlineRounded />
          Ver perfil
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <EditRounded />
          Editar funcionário
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={handleClose}
          sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
        >
          <DeleteOutlineRounded />
          Remover da equipe
        </MenuItem>
      </Menu>
    </>
  )
}
