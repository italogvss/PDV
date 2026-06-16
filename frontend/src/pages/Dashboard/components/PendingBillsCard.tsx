import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined'
import { Avatar, Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../../../hooks/useExpenses'
import { EXPENSE_CATEGORY_LABELS } from '../../Expenses/types'
import { formatBRL } from '../../../utils/currency'
import QuickActionCard from './QuickActionCard'

export default function PendingBillsCard() {
  const navigate = useNavigate()
  const { data: expenses, isLoading } = useExpenses()

  const pending = (expenses ?? [])
    .filter((expense) => !expense.isPaid)
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())

  return (
    <QuickActionCard
      title="Contas a pagar"
      badge={pending.length > 0 ? { label: `${pending.length} pendentes`, color: 'warning' } : undefined}
      footerLabel="Ver todas as despesas"
      onFooter={() => navigate('/despesas')}
      loading={isLoading}
      isEmpty={pending.length === 0}
      emptyText="Nenhuma conta pendente."
    >
      {pending.slice(0, 3).map((expense) => (
        <Box key={expense.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: 'surface.raised', color: 'text.tertiary' }}>
            <ReceiptLongOutlined sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {expense.description}
            </Typography>
            <Typography variant="caption" color="text.tertiary" noWrap>
              Vence {dayjs(expense.dueDate).format('DD/MM')} • {EXPENSE_CATEGORY_LABELS[expense.category].label}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatBRL(expense.amount)}
          </Typography>
        </Box>
      ))}
    </QuickActionCard>
  )
}
