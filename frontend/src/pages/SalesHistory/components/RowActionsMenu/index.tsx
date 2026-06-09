import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined'
import BlockRounded from '@mui/icons-material/BlockRounded'
import type { RowActionsMenuProps } from './types'

export default function RowActionsMenu({ sale, canCancel, onViewDetails, onCancel }: RowActionsMenuProps) {
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
        <MenuItem onClick={() => { handleClose(); onViewDetails(sale.id) }}>
          <ReceiptLongOutlined />
          Ver detalhes
        </MenuItem>

        {canCancel && sale.status !== 'Cancelado' && [
          <Divider key="div" sx={{ my: 0.5 }} />,
          <MenuItem
            key="cancel"
            onClick={() => { handleClose(); onCancel(sale.id) }}
            sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
          >
            <BlockRounded />
            Cancelar venda
          </MenuItem>,
        ]}
      </Menu>
    </>
  )
}
