import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider, Typography, Button, Box } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import type { ServiceRowMenuProps } from './types'

export default function ServiceRowMenu({ service, onEdit, onDelete }: ServiceRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleClose = () => {
    setAnchor(null)
    setConfirmingDelete(false)
  }

  const handleEdit = () => {
    handleClose()
    onEdit(service)
  }

  const handleDeleteConfirm = () => {
    handleClose()
    onDelete(service.id)
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
        {!confirmingDelete ? (
          [
            <MenuItem key="edit" onClick={handleEdit}>
              <EditRounded />
              Editar serviço
            </MenuItem>,
            <Divider key="divider" sx={{ my: 0.5 }} />,
            <MenuItem
              key="delete"
              onClick={() => setConfirmingDelete(true)}
              sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
            >
              <DeleteOutlineRounded />
              Desativar
            </MenuItem>,
          ]
        ) : (
          <Box sx={{ px: 2, py: 1.5, maxWidth: 220 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Desativar serviço?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Você podera reativar nas configurações depois
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="ghost" onClick={handleClose} sx={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={handleDeleteConfirm}
                sx={{ flex: 1 }}
              >
                Desativar
              </Button>
            </Box>
          </Box>
        )}
      </Menu>
    </>
  )
}
