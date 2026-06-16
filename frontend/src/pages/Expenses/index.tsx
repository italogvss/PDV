import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  useTheme,
  CircularProgress,
} from '@mui/material'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import SyncRounded from '@mui/icons-material/SyncRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { formatBRL } from '../../utils/currency'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from './types'
import type { Expense, ExpenseCategory } from './types'
import ExpenseStatusChip from './components/ExpenseStatusChip'
import ExpenseRowMenu from './components/ExpenseRowMenu'
import DonutChart from './components/DonutChart'
import NewExpenseModal from './components/NewExpenseModal'
import {
  useExpenses,
  useRecurringExpenses,
  useMarkExpensePaid,
  useDeleteExpense,
} from '../../hooks/useExpenses'
import { useUserPermissions } from '../../hooks/useUserPermissions'
import FiltersPopover from '../../components/FiltersPopover'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]


function fmtDueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

export default function ExpensesPage() {
  const theme = useTheme()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [recurringFilter, setRecurringFilter] = useState('Todas')
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)

  const { data: expenses = [], isLoading } = useExpenses(selectedMonth, selectedYear)
  const { data: recurringExpenses = [] } = useRecurringExpenses()
  const markAsPaid = useMarkExpensePaid()
  const deleteExpense = useDeleteExpense()
  const { hasPermission } = useUserPermissions()
  const canManage = hasPermission('ManageExpenses')

  const monthName = MONTHS_PT[selectedMonth - 1]
  const year = selectedYear

  const kpis = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const paid = expenses.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0)
    const pending = expenses.filter((e) => !e.isPaid).reduce((sum, e) => sum + e.amount, 0)
    const paidCount = expenses.filter((e) => e.isPaid).length
    const pendingCount = expenses.filter((e) => !e.isPaid).length
    const recurringList = expenses.filter((e) => e.isRecurring)
    const recurringTotal = recurringList.reduce((sum, e) => sum + e.amount, 0)
    const recurringCount = recurringList.length
    return { total, paid, pending, paidCount, pendingCount, recurringTotal, recurringCount }
  }, [expenses])

  const categoryColorMap: Record<ExpenseCategory, string> = {
    Salarios: theme.palette.data.purple.main,
    Aluguel: theme.palette.success.main,
    Fornecedor: theme.palette.data.blue.main,
    Energia: theme.palette.data.orange.main,
    Agua: theme.palette.info.main,
    Marketing: theme.palette.error.main,
    Internet: theme.palette.text.disabled,
    Impostos: theme.palette.warning.main,
    Manutencao: theme.palette.secondary.main,
    Outros: theme.palette.text.secondary,
  }

  const donutSegments = EXPENSE_CATEGORIES.map((cat) => ({
    label: EXPENSE_CATEGORY_LABELS[cat].label,
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
    color: categoryColorMap[cat],
  }))
    .filter((seg) => seg.value > 0)
    .sort((a, b) => b.value - a.value)

  const upcomingRenewals = useMemo(
    () => [...recurringExpenses].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [recurringExpenses],
  )

  const rows = useMemo(() => {
    if (recurringFilter === 'Recorrentes') return expenses.filter((e) => e.isRecurring)
    if (recurringFilter === 'Pontuais') return expenses.filter((e) => !e.isRecurring)
    return expenses
  }, [expenses, recurringFilter])

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingExpense(null)
  }

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'description',
      headerName: 'Descrição',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }: { row: Expense }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row.isRecurring && (
            <Chip
              label="Mensal"
              size="small"
              icon={<SyncRounded />}
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: 'success.light',
                color: 'success.dark',
                border: '1px solid',
                borderColor: 'success.main',
                '& .MuiChip-icon': { fontSize: '11px !important', color: 'inherit', ml: 0.5, mr: '-4px' },
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.description}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category',
      headerName: 'Categoria',
      width: 130,
      renderCell: ({ row }: { row: Expense }) => (
        <Chip
          size="large"
          
          label={EXPENSE_CATEGORY_LABELS[row.category].label}
          sx={{
            fontWeight: 500,
            bgcolor: EXPENSE_CATEGORY_LABELS[row.category].color,
            borderRadius: 'pill',
            border: "none",
            color: "common.white",
            px: 1,
            py: 0.5,
          }}
        >
        </Chip>
      ),
    },
    {
      field: 'dueDate',
      headerName: 'Vencimento',
      width: 110,
      renderCell: ({ row }: { row: Expense }) => (
        <Typography variant="body2" color="text.secondary">
          {fmtDueDate(row.dueDate)}
        </Typography>
      ),
    },
    {
      field: 'isRecurring',
      headerName: 'Renovação',
      width: 110,
      renderCell: ({ row }: { row: Expense }) =>
        row.isRecurring ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SyncRounded sx={{ fontSize: 13, color: 'text.tertiary' }} />
            <Typography variant="body2" color="text.secondary">
              mensal
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: 'isPaid',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }: { row: Expense }) => <ExpenseStatusChip isPaid={row.isPaid} />,
    },
    {
      field: 'amount',
      headerName: 'Valor',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: { row: Expense }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatBRL(row.amount)}
        </Typography>
      ),
    },
    {
      field: 'rowActions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: { row: Expense }) => (
        <ExpenseRowMenu
          expense={row}
          canManage={canManage}
          onEdit={handleOpenEdit}
          onMarkPaid={(id) => markAsPaid.mutate(id)}
          onDelete={(id) => deleteExpense.mutate(id)}
        />
      ),
    },
  ], [markAsPaid, deleteExpense, canManage, handleOpenEdit])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Despesas" description={`${monthName} de ${year} • Controle financeiro`}>
        <DatePicker
          label="Mês e Ano"
          views={['month', 'year']}
          value={dayjs().year(selectedYear).month(selectedMonth - 1)}
          onChange={(newValue) => {
            if (newValue) {
              setSelectedMonth(newValue.month() + 1)
              setSelectedYear(newValue.year())
            }
          }}
          format="MMMM YYYY"
          slotProps={{ textField: { sx: { width: 200 } } }}
        />
        {canManage && (
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setModalOpen(true)}>
            Nova despesa
          </Button>
        )}
      </PageHeader>

      <PageKpiGrid>
        <PageKpiCard
          icon={ReceiptLongRounded}
          label="Total do mês"
          value={formatBRL(kpis.total)}
          badge={{ label: 'Total de despesas', color: 'error', icon: TrendingDownRounded }}
        />
        <PageKpiCard
          icon={CheckCircleOutlineRounded}
          label="Pagas"
          value={formatBRL(kpis.paid)}
          badge={{ label: `${kpis.paidCount} contas`, color: 'success', icon: TrendingUpRounded }}
        />
        <PageKpiCard
          icon={AccessTimeRounded}
          label="A pagar"
          value={formatBRL(kpis.pending)}
          badge={{ label: `${kpis.pendingCount} vencimentos`, color: 'warning', icon: WarningAmberRounded }}
        />
        <PageKpiCard
          icon={SyncRounded}
          label="Recorrentes"
          value={formatBRL(kpis.recurringTotal)}
          badge={{ label: `${kpis.recurringCount} contas fixas/mês`, color: 'info', icon: SyncRounded }}
        />
      </PageKpiGrid>

      {/* Conteúdo principal: tabela + painel lateral */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
          alignItems: 'start',
        }}
      >
        {/* Tabela */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Histórico de despesas
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<FilterListRounded />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
            >
              {recurringFilter !== 'Todas' ? 'Filtros (1)' : 'Filtros'}
            </Button>

            <FiltersPopover
              anchorEl={filterAnchor}
              onClose={() => setFilterAnchor(null)}
              onClear={() => setRecurringFilter('Todas')}
              sections={[
                { id: 'tipo', label: 'Tipo', options: ['Todas', 'Recorrentes', 'Pontuais'], value: recurringFilter, onChange: setRecurringFilter },
              ]}
            />
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              rowHeight={60}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              onRowDoubleClick={(params) => handleOpenEdit(params.row)}             
            />
          )}
        </Card>

        {/* Painel lateral */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Gráfico por categoria */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                Por categoria
              </Typography>
              <DonutChart segments={donutSegments} />
            </CardContent>
          </Card>

          {/* Próximas renovações */}
          <Card>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2.5,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SyncRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Próximas renovações
                </Typography>
              </Box>
              <Chip
                label={upcomingRenewals.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {upcomingRenewals.map((expense, idx) => (
                <Box
                  key={expense.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.75,
                    borderBottom: idx < upcomingRenewals.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: categoryColorMap[expense.category] + '22',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                      {expense.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <CalendarTodayOutlined sx={{ fontSize: 11, color: 'text.tertiary' }} />
                      <Typography variant="caption" color="text.tertiary">
                        Vence em {fmtDueDate(expense.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                    {formatBRL(expense.amount)}
                  </Typography>
                </Box>
              ))}

              {upcomingRenewals.length === 0 && (
                <Box sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">
                    Nenhuma renovação pendente
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2.5,
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total fixo mensal
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatBRL(kpis.recurringTotal)}
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>

      <NewExpenseModal
        open={modalOpen}
        onClose={handleCloseModal}
        expense={editingExpense ?? undefined}
      />
    </Box>
  )
}
