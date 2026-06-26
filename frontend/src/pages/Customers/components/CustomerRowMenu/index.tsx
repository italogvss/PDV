import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import WhatsApp from '@mui/icons-material/WhatsApp'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import type { Customer } from '../../../../types/customers.types'

interface CustomerRowMenuProps {
  customer: Customer
  onNavigate: () => void
  onDelete: () => void
}

export default function CustomerRowMenu({ customer, onNavigate, onDelete }: CustomerRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleClose = () => setAnchor(null)

  const handleWhatsApp = () => {
    handleClose()
    const phone = customer.phone?.replace(/\D/g, '')
    if (phone) window.open(`https://wa.me/55${phone}`, '_blank')
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
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
        onClick={(e) => e.stopPropagation()}
      >
        {customer.phone && (
          <MenuItem onClick={handleWhatsApp} sx={{ color: 'success.main', '& svg': { color: 'success.main' } }}>
            <WhatsApp />
            WhatsApp
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleClose()
            onNavigate()
          }}
        >
          <OpenInNewRounded />
          Ver detalhes
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
            setConfirmOpen(true)
          }}
          sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
        >
          <DeleteOutlineRounded />
          Excluir
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir cliente?"
        description={<><strong>{customer.name}</strong> será removido permanentemente. Esta ação não pode ser desfeita.</>}
        confirmLabel="Excluir"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete()
        }}
      />
    </>
  )
}
