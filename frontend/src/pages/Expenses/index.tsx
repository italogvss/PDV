import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import AddRounded from '@mui/icons-material/AddRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { formatBRL } from '../../utils/currency'
import { MOCK_EXPENSES } from './mock'
import { EXPENSE_CATEGORIES } from './types'
import type { ExpenseCategory } from './types'
import ExpenseStatusChip from './components/ExpenseStatusChip'
import ExpenseRowMenu from './components/ExpenseRowMenu'
import DonutChart from './components/DonutChart'
import NewExpenseModal from './components/NewExpenseModal'

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const CHIP_ICON_SX = {
  '& .MuiChip-icon': {
    fontSize: '12px !important',
    color: 'inherit',
    ml: 0.75,
    mr: '-3px',
  },
}

// Columns defined outside component to avoid recreation on render
const columns: GridColDef[] = [
  {
    field: 'description',
    headerName: 'Descrição',
    flex: 1,
    minWidth: 180,
    renderCell: ({ row }) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.description}
      </Typography>
    ),
  },
  {
    field: 'category',
    headerName: 'Categoria',
    width: 130,
    renderCell: ({ row }) => (
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          bgcolor: 'surface.raised',
          border: '1px solid',
          borderColor: 'border.subtle',
          borderRadius: 'pill',
          px: 1.25,
          py: 0.5,
        }}
      >
        {row.category}
      </Typography>
    ),
  },
  {
    field: 'dueDate',
    headerName: 'Vencimento',
    width: 110,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.dueDate}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: ({ row }) => <ExpenseStatusChip status={row.status} />,
  },
  {
    field: 'amount',
    headerName: 'Valor',
    width: 130,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
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
    renderCell: ({ row }) => <ExpenseRowMenu expense={row} />,
  },
]

export default function ExpensesPage() {
  const theme = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | null>(null)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)

  const selectedMonth = new Date(2026, 4, 1) // Maio 2026 (mock)
  const monthName = MONTHS_PT[selectedMonth.getMonth()]
  const year = selectedMonth.getFullYear()

  const kpis = useMemo(() => {
    const total = MOCK_EXPENSES.reduce((sum, e) => sum + e.amount, 0)
    const paid = MOCK_EXPENSES.filter((e) => e.status === 'Pago').reduce((sum, e) => sum + e.amount, 0)
    const pending = MOCK_EXPENSES.filter((e) => e.status === 'Pendente').reduce((sum, e) => sum + e.amount, 0)
    const paidCount = MOCK_EXPENSES.filter((e) => e.status === 'Pago').length
    const pendingCount = MOCK_EXPENSES.filter((e) => e.status === 'Pendente').length
    return { total, paid, pending, paidCount, pendingCount }
  }, [])

  const categoryColorMap: Record<ExpenseCategory, string> = {
    Salários: theme.palette.data.purple.main,
    Aluguel: theme.palette.success.main,
    Fornecedor: theme.palette.data.blue.main,
    Energia: theme.palette.data.orange.main,
    Marketing: theme.palette.error.main,
    Internet: theme.palette.text.disabled,
    Outros: theme.palette.text.secondary,
  }

  const donutSegments = EXPENSE_CATEGORIES.map((cat) => ({
    label: cat,
    value: MOCK_EXPENSES.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
    color: categoryColorMap[cat],
  }))
    .filter((seg) => seg.value > 0)
    .sort((a, b) => b.value - a.value)

  const rows = useMemo(
    () =>
      categoryFilter
        ? MOCK_EXPENSES.filter((e) => e.category === categoryFilter)
        : MOCK_EXPENSES,
    [categoryFilter],
  )

  const fmtNumber = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h1">Despesas</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {monthName} de {year} • Controle financeiro
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarMonthOutlined />}
            endIcon={<ArrowDropDownRounded />}
          >
            {monthName} {year}
          </Button>
          <Button variant="outlined" size="small" startIcon={<FileDownloadOutlined />}>
            Exportar
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
            onClick={() => setModalOpen(true)}
          >
            Nova despesa
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ReceiptLongRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Total do mês
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                R$
              </Typography>
              <Typography variant="h1" sx={{ lineHeight: 1 }}>
                {fmtNumber(kpis.total)}
              </Typography>
            </Box>
            <Chip
              size="small"
              color="error"
              icon={<TrendingDownRounded />}
              label="-4,1% vs. abril"
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CheckCircleOutlineRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                Pagas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                R$
              </Typography>
              <Typography variant="h1" sx={{ lineHeight: 1 }}>
                {fmtNumber(kpis.paid)}
              </Typography>
            </Box>
            <Chip
              size="small"
              color="success"
              icon={<TrendingUpRounded />}
              label={`${kpis.paidCount} contas`}
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AccessTimeRounded sx={{ fontSize: 15, color: 'text.tertiary' }} />
              <Typography variant="caption" color="text.secondary">
                A pagar
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                R$
              </Typography>
              <Typography variant="h1" sx={{ lineHeight: 1 }}>
                {fmtNumber(kpis.pending)}
              </Typography>
            </Box>
            <Chip
              size="small"
              color="warning"
              icon={<WarningAmberRounded />}
              label={`${kpis.pendingCount} vencimentos próximos`}
              sx={CHIP_ICON_SX}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Conteúdo principal: tabela + gráfico */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            lg: '3fr 2fr',
          },
          alignItems: 'start',
        }}
      >
        {/* Tabela de despesas */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Histórico de despesas
            </Typography>
            <Button
              size="small"
              variant="outlined"
              endIcon={<FilterListRounded sx={{ fontSize: 16 }} />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              color={categoryFilter ? 'primary' : 'inherit'}
            >
              {categoryFilter ?? 'Categoria'}
            </Button>
          </Box>

          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                setCategoryFilter(null)
                setFilterAnchor(null)
              }}
              selected={categoryFilter === null}
            >
              Todas
            </MenuItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <MenuItem
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat)
                  setFilterAnchor(null)
                }}
                selected={categoryFilter === cat}
              >
                {cat}
              </MenuItem>
            ))}
          </Menu>

          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            rowHeight={60}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={(t) => ({
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: t.palette.surface.sunken,
                borderBottom: `1px solid ${t.palette.border.subtle}`,
              },
              '& .MuiDataGrid-columnHeader': {
                '&:focus, &:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.05em',
                color: t.palette.text.tertiary,
                textTransform: 'uppercase',
              },
              '& .MuiDataGrid-columnSeparator': { display: 'none' },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${t.palette.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                '&:focus, &:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: t.palette.surface.sunken,
              },
              '& .MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
                borderBottom: 'none',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `1px solid ${t.palette.border.subtle}`,
                minHeight: 48,
              },
              '& .MuiDataGrid-selectedRowCount': { display: 'none' },
            })}
          />
        </Card>

        {/* Gráfico por categoria */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
              Por categoria
            </Typography>
            <DonutChart segments={donutSegments} />
          </CardContent>
        </Card>
      </Box>

      <NewExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Box>
  )
}
