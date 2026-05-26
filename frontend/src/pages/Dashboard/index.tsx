import { useState, useMemo } from 'react'
import { Box, Typography, Button, Menu, MenuItem } from '@mui/material'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import { formatBRL } from '../../utils/currency'
import { MOCK_METRICS, MOCK_DAILY_BILLING, MOCK_PAYMENT_METHODS, MOCK_SALES, MOCK_TOP_PRODUCTS } from './mock'
import { DateRangeOption } from '../../types/report.types'
import DashboardMetricCard from './components/DashboardMetricCard'
import BillingChart from './components/BillingChart'
import PaymentMethodsChart from './components/PaymentMethodsChart'
import RecentSalesTable from './components/RecentSalesTable'
import TopProductsTable from './components/TopProductsTable'
import { useAppSelector } from '../../store'

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { label: '7 dias', days: 7 },
  { label: '14 dias', days: 14 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

export default function DashboardPage() {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [selectedDays, setSelectedDays] = useState(14)
  const name = useAppSelector((state) => state.auth.name) ?? 'Usuário'

  const selectedDateRange = useMemo(
    () => DATE_RANGE_OPTIONS.find((opt) => opt.days === selectedDays) || DATE_RANGE_OPTIONS[1],
    [selectedDays],
  )

  const handleNewSale = () => {
    // TODO: Navigate to sales page or open sales modal
    console.log('Nova venda')
  }

  const handleExport = () => {
    // TODO: Implementar exportação
    console.log('Exportar')
  }

  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

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
          <Typography variant="h1">Olá, {name} 👋</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Atualizações até {formattedDate}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarMonthOutlined />}
            endIcon={<ArrowDropDownRounded />}
            onClick={(e) => setDateAnchor(e.currentTarget)}
          >
            {selectedDateRange.label}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlined />}
            onClick={handleExport}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddRounded />}
            onClick={handleNewSale}
          >
            Nova venda
          </Button>
        </Box>
      </Box>

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

      {/* KPIs - Métricas principais */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        <DashboardMetricCard
          icon={ShoppingCartRounded}
          label="Faturamento de hoje"
          value={formatBRL(MOCK_METRICS.billingToday)}
          change={MOCK_METRICS.billingTodayChange}
          changeLabel={`+${MOCK_METRICS.billingTodayChange}% ontem`}
          isPositive={true}
        />
        <DashboardMetricCard
          icon={WarningRounded}
          label="Estoque baixo"
          value={MOCK_METRICS.lowStockCount.toString()}
          change={MOCK_METRICS.criticalStockCount}
          changeLabel={`${MOCK_METRICS.criticalStockCount} críticos`}
          isPositive={false}
        />
        <DashboardMetricCard
          icon={ShoppingCartRounded}
          label="Despesas de mês"
          value={formatBRL(MOCK_METRICS.monthlyExpenses)}
          change={Math.abs(MOCK_METRICS.monthlyExpensesChange)}
          changeLabel={`${MOCK_METRICS.monthlyExpensesChange}% vs. abril`}
          isPositive={false}
        />
        <DashboardMetricCard
          icon={LocalFireDepartmentRounded}
          label="Lucros estimados"
          value={formatBRL(MOCK_METRICS.estimatedProfit)}
          change={MOCK_METRICS.estimatedProfitChange}
          changeLabel={`+${MOCK_METRICS.estimatedProfitChange}% vs. mês ant.`}
          isPositive={true}
        />
      </Box>

      {/* Gráfico de faturamento 
      <BillingChart data={MOCK_DAILY_BILLING} />


      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            lg: '2fr 3fr',
          },
        }}
      >
        <PaymentMethodsChart methods={MOCK_PAYMENT_METHODS} />
        <RecentSalesTable sales={MOCK_SALES} />
      </Box>
      <TopProductsTable products={MOCK_TOP_PRODUCTS} />
      */}
    </Box>
  )
}
