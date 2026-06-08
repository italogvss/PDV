import AddRounded from '@mui/icons-material/AddRounded'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import { Box, Button, Menu, MenuItem } from '@mui/material'
import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import { useAppSelector } from '../../store'
import { formatBRL } from '../../utils/currency'
import { MOCK_METRICS } from './mock'

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
      <PageHeader title={`Olá, ${name} 👋`} description={`Atualizações até ${formattedDate}`}>
        <Button
          variant="outlined"
          startIcon={<CalendarMonthOutlined />}
          endIcon={<ArrowDropDownRounded />}
          onClick={(e) => setDateAnchor(e.currentTarget)}
        >
          {selectedDateRange.label}
        </Button>
        <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={handleExport}>
          Exportar
        </Button>
        <Button variant="contained" color="success" startIcon={<AddRounded />} onClick={handleNewSale}>
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

      <PageKpiGrid>
        <PageKpiCard
          icon={ShoppingCartRounded}
          label="Faturamento de hoje"
          value={formatBRL(MOCK_METRICS.billingToday)}
          badge={{ label: `+${MOCK_METRICS.billingTodayChange}% ontem`, color: 'success', icon: TrendingUpRounded }}
        />
        <PageKpiCard
          icon={WarningRounded}
          label="Estoque baixo"
          value={MOCK_METRICS.lowStockCount.toString()}
          badge={{ label: `${MOCK_METRICS.criticalStockCount} críticos`, color: 'error', icon: TrendingDownRounded }}
        />
        <PageKpiCard
          icon={ShoppingCartRounded}
          label="Despesas do mês"
          value={formatBRL(MOCK_METRICS.monthlyExpenses)}
          badge={{ label: `${MOCK_METRICS.monthlyExpensesChange}% vs. abril`, color: 'error', icon: TrendingDownRounded }}
        />
        <PageKpiCard
          icon={LocalFireDepartmentRounded}
          label="Lucros estimados"
          value={formatBRL(MOCK_METRICS.estimatedProfit)}
          badge={{ label: `+${MOCK_METRICS.estimatedProfitChange}% vs. mês ant.`, color: 'success', icon: TrendingUpRounded }}
        />
      </PageKpiGrid>

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
