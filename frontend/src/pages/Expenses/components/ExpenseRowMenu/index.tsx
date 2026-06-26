import { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material'
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded'
import EditRounded from '@mui/icons-material/EditRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import type { ExpenseRowMenuProps } from './types'

type DeleteScope = 'single' | 'future' | 'all'

export default function ExpenseRowMenu({ expense, canManage, onEdit, onMarkPaid, onDelete, onDeleteSeries }: ExpenseRowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [confirmScope, setConfirmScope] = useState<DeleteScope | null>(null)

  const handleClose = () => setAnchor(null)
  const isSeries = expense.isRecurring && expense.repeatCount != null
  const isSalaryExpense = expense.employeeId != null

  if (!canManage) return null

  const handleConfirm = () => {
    if (!confirmScope) return
    if (confirmScope === 'single') {
      onDelete(expense.id)
    } else {
      onDeleteSeries?.(expense.id, confirmScope)
    }
    setConfirmScope(null)
  }

  const confirmTitle = confirmScope === 'all'
    ? 'Excluir toda a série?'
    : confirmScope === 'future'
    ? 'Excluir despesas futuras?'
    : 'Excluir despesa?'

  const confirmText = confirmScope === 'all'
    ? (<>Todas as entradas de <strong>{expense.description}</strong> serão removidas permanentemente, incluindo passadas e futuras. Esta ação não pode ser desfeita.</>)
    : confirmScope === 'future'
    ? (<>Todas as entradas futuras de <strong>{expense.description}</strong> serão removidas permanentemente. A entrada atual não será afetada.</>)
    : (<><strong>{expense.description}</strong> será removida permanentemente. Esta ação não pode ser desfeita.</>)

  const salaryTooltip = 'Despesa de salário — gerada automaticamente. Desative o salário automático do funcionário para encerrar a série.'

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
        <MenuItem onClick={() => { handleClose(); onEdit(expense) }}>
          <EditRounded />
          Editar
        </MenuItem>
        {!expense.isPaid && (
          <MenuItem onClick={() => { handleClose(); onMarkPaid(expense.id) }}>
            <CheckCircleOutlineRounded />
            Marcar como pago
          </MenuItem>
        )}
        <Divider sx={{ my: 0.5 }} />
        <Tooltip title={isSalaryExpense ? salaryTooltip : ''} placement="left">
          <span>
            <MenuItem
              onClick={() => { handleClose(); setConfirmScope('single') }}
              disabled={isSalaryExpense}
              sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
            >
              <DeleteOutlineRounded />
              {isSeries ? 'Excluir somente esta' : 'Excluir'}
            </MenuItem>
          </span>
        </Tooltip>
        {isSeries && (
          <Tooltip title={isSalaryExpense ? salaryTooltip : ''} placement="left">
            <span>
              <MenuItem
                onClick={() => { handleClose(); setConfirmScope('future') }}
                disabled={isSalaryExpense}
                sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
              >
                <DeleteOutlineRounded />
                Excluir apenas futuras
              </MenuItem>
            </span>
          </Tooltip>
        )}
        {isSeries && (
          <Tooltip title={isSalaryExpense ? salaryTooltip : ''} placement="left">
            <span>
              <MenuItem
                onClick={() => { handleClose(); setConfirmScope('all') }}
                disabled={isSalaryExpense}
                sx={{ color: 'error.main', '& svg': { color: 'error.main' } }}
              >
                <DeleteOutlineRounded />
                Excluir todas
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>

      <ConfirmDialog
        open={confirmScope !== null}
        title={confirmTitle}
        description={confirmText}
        confirmLabel="Excluir"
        onClose={() => setConfirmScope(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
