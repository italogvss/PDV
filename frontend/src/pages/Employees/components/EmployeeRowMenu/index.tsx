import { useState } from 'react'
import { IconButton, Menu, MenuItem, Divider } from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import PersonOffOutlined from '@mui/icons-material/PersonOffOutlined'
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined'
import { useDeactivateEmployee, useReactivateEmployee } from '../../../../hooks/useEmployees'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import type { EmployeeRowMenuProps } from './types'

export default function EmployeeRowMenu({ employee, onEdit }: EmployeeRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deactivate = useDeactivateEmployee()
  const reactivate = useReactivateEmployee()

  const handleClose = () => setAnchor(null)

  const handleDeactivate = async () => {
    setConfirmOpen(false)
    await deactivate.mutateAsync(employee.id)
  }

  const handleReactivate = async () => {
    handleClose()
    await reactivate.mutateAsync(employee.id)
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

        <Divider sx={{ my: 0.5 }} />

        {employee.isActive ? (
          <MenuItem
            onClick={() => {
              handleClose()
              setConfirmOpen(true)
            }}
            sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
          >
            <PersonOffOutlined />
            Desativar
          </MenuItem>
        ) : (
          <MenuItem
            onClick={handleReactivate}
            sx={{ color: 'success.main', '& svg': { color: 'success.main' } }}
          >
            <PersonAddAltOutlined />
            Reativar
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={confirmOpen}
        title="Desativar funcionário?"
        description={`${employee.name} perderá o acesso ao sistema imediatamente. Você pode reativá-lo a qualquer momento.`}
        confirmLabel="Desativar"
        isPending={deactivate.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeactivate}
      />
    </>
  )
}
