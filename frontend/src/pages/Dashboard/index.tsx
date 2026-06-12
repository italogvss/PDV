import AddRounded from '@mui/icons-material/AddRounded'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import { Box, Button, Menu, MenuItem, Skeleton } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { useProducts } from '../../hooks/useProducts'
import { useExpensesByCategory, useSalesMetrics } from '../../hooks/useReports'
import { useAppSelector } from '../../store'
import { formatBRL } from '../../utils/currency'

interface DateRangeOption {
  label: string
  days: number
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: '7 dias', days: 7 },
  { label: '14 dias', days: 14 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [selectedDays, setSelectedDays] = useState(14)
  const name = useAppSelector((state) => state.auth.name) ?? 'Usuário'

  const selectedDateRange = useMemo(
    () => DATE_RANGE_OPTIONS.find((opt) => opt.days === selectedDays) ?? DATE_RANGE_OPTIONS[1],
    [selectedDays],
  )

  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = useMemo(() => dayjs().subtract(selectedDays, 'day').format('YYYY-MM-DD'), [selectedDays])

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(startDate, endDate)
  const { data: products } = useProducts()
  const { data: expensesByCategory, isLoading: expensesLoading } = useExpensesByCategory(startDate, endDate)

  const lowStockCount = useMemo(
    () => products?.filter((p) => p.minStock !== undefined && p.stock <= p.minStock).length ?? 0,
    [products],
  )

  const criticalStockCount = useMemo(
    () => products?.filter((p) => p.criticalStock !== undefined && p.stock <= p.criticalStock).length ?? 0,
    [products],
  )

  const totalExpenses = useMemo(
    () => expensesByCategory?.reduce((sum, e) => sum + e.total, 0) ?? 0,
    [expensesByCategory],
  )

  const estimatedProfit = (metrics?.totalRevenue ?? 0) - totalExpenses

  const kpisLoading = metricsLoading || expensesLoading

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title={`Olá, ${name} 👋`} description={`Atualizações até ${formattedDate}`}>
        <Button
          variant="outlined"
          startIcon={<CalendarMonthOutlined />}
          endIcon={<ArrowDropDownRounded />}
          onClick={(e) => setDateAnchor(e.currentTarget)}
        >
          {selectedDateRange.label}
        </Button>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => navigate('/vendas')}>
          Nova venda
        </Button>
      </PageHeader>

      <Menu
        anchorEl={dateAnchor}
        open={Boolean(dateAnchor)}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <MenuItem
            key={option.days}
            onClick={() => {
              setSelectedDays(option.days)
              setDateAnchor(null)
            }}
            selected={selectedDays === option.days}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {kpisLoading ? (
        <PageKpiGrid>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </PageKpiGrid>
      ) : (
        <PageKpiGrid>
          <PageKpiCard
            icon={ShoppingCartRounded}
            label="Faturamento do período"
            value={formatBRL(metrics?.totalRevenue ?? 0)}
            badge={{ label: `${metrics?.totalSales ?? 0} vendas`, color: 'success', icon: TrendingUpRounded }}
          />
          <PageKpiCard
            icon={WarningRounded}
            label="Estoque baixo"
            value={lowStockCount.toString()}
            badge={
              criticalStockCount > 0
                ? { label: `${criticalStockCount} críticos`, color: 'error', icon: TrendingDownRounded }
                : undefined
            }
          />
          <PageKpiCard
            icon={ReceiptLongRounded}
            label="Despesas do período"
            value={formatBRL(totalExpenses)}
            badge={{ label: selectedDateRange.label, color: 'warning', icon: TrendingDownRounded }}
          />
          <PageKpiCard
            icon={LocalFireDepartmentRounded}
            label="Lucro estimado"
            value={formatBRL(estimatedProfit)}
            badge={
              estimatedProfit >= 0
                ? { label: 'positivo', color: 'success', icon: TrendingUpRounded }
                : { label: 'negativo', color: 'error', icon: TrendingDownRounded }
            }
          />
        </PageKpiGrid>
      )}
    </Box>
  )
}
