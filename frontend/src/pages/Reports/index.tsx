import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import { formatBRL } from '../../utils/currency'
import {
  useSalesMetrics,
  useFinancialSummary,
  useSalesByOperator,
  useSalesByPaymentMethod,
  useTopProducts,
  useExpensesByCategory,
} from '../../hooks/useReports'
import type { MonthPreset, GroupBy } from '../../types/report.types'
import MetricCard from './components/MetricCard'
import FinancialBarChart from './components/FinancialBarChart'
import AccumulatedProfitChart from './components/AccumulatedProfitChart'
import RevenueLineChart from './components/RevenueLineChart'
import OperatorRankingChart from './components/OperatorRankingChart'
import TopProductsChart from './components/TopProductsChart'
import PaymentMethodPieChart from './components/PaymentMethodPieChart'
import ExpensesByCategoryPieChart from './components/ExpensesByCategoryPieChart'

const MONTH_PRESETS: MonthPreset[] = [
  { label: 'Último mês',       key: '1m',  months: 1  },
  { label: 'Últimos 2 meses',  key: '2m',  months: 2  },
  { label: 'Últimos 3 meses',  key: '3m',  months: 3  },
  { label: 'Últimos 6 meses',  key: '6m',  months: 6  },
  { label: 'Últimos 12 meses', key: '12m', months: 12 },
]

function suggestGroupBy(monthsSpan: number): GroupBy {
  if (monthsSpan <= 1) return 'day'
  if (monthsSpan <= 6) return 'week'
  return 'month'
}

export default function ReportsPage() {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [startMonth, setStartMonth] = useState<Dayjs>(dayjs().subtract(1, 'month'))
  const [endMonth, setEndMonth] = useState<Dayjs>(dayjs())
  const [selectedPreset, setSelectedPreset] = useState<string | null>('1m')
  const [groupBy, setGroupBy] = useState<GroupBy>('week')

  const startDate = startMonth.startOf('month').format('YYYY-MM-DD')
  const endDate = endMonth.endOf('month').format('YYYY-MM-DD')

  const monthsSpan = useMemo(
    () => endMonth.startOf('month').diff(startMonth.startOf('month'), 'month') + 1,
    [startMonth, endMonth],
  )

  // Ao trocar o período, reajusta a granularidade para uma escala adequada.
  // Alternar o toggle manualmente não mexe no span, então a escolha do usuário persiste.
  useEffect(() => {
    setGroupBy(suggestGroupBy(monthsSpan))
  }, [monthsSpan])

  const presetLabel = useMemo(
    () => MONTH_PRESETS.find((p) => p.key === selectedPreset)?.label ?? 'Personalizado',
    [selectedPreset],
  )

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(startDate, endDate)
  const { data: financial, isLoading: financialLoading } = useFinancialSummary(
    startDate,
    endDate,
    groupBy,
  )
  const { data: byOperator, isLoading: operatorLoading } = useSalesByOperator(startDate, endDate)
  const { data: byPayment, isLoading: paymentLoading } = useSalesByPaymentMethod(startDate, endDate)
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(startDate, endDate)
  const { data: byCategory, isLoading: categoryLoading } = useExpensesByCategory(startDate, endDate)

  const cancellationRate = useMemo(() => {
    if (!metrics) return null
    const total = metrics.totalSales + metrics.cancelledCount
    if (total === 0) return null
    return ((metrics.cancelledCount / total) * 100).toFixed(1)
  }, [metrics])

  const handlePresetSelect = (preset: MonthPreset) => {
    setStartMonth(dayjs().subtract(preset.months, 'month'))
    setEndMonth(dayjs())
    setSelectedPreset(preset.key)
    setDateAnchor(null)
  }

  const handleExportPDF = () => {
    // TODO: Implementar exportação em PDF
    console.log('Exportar relatório em PDF')
  }

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
          <Typography variant="h1">Lucros & relatórios</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Análise financeira detalhada
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, pt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarMonthOutlined />}
            endIcon={<ArrowDropDownRounded />}
            onClick={(e) => setDateAnchor(e.currentTarget)}
          >
            {presetLabel}
          </Button>

          <DatePicker
            label="De"
            views={['month', 'year']}
            openTo="month"
            format="MM/YYYY"
            value={startMonth}
            onChange={(val) => {
              if (val) {
                setStartMonth(val)
                setSelectedPreset(null)
              }
            }}
            slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
          />

          <DatePicker
            label="Até"
            views={['month', 'year']}
            openTo="month"
            format="MM/YYYY"
            value={endMonth}
            minDate={startMonth}
            onChange={(val) => {
              if (val) {
                setEndMonth(val)
                setSelectedPreset(null)
              }
            }}
            slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
          />

          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<FileDownloadOutlined />}
            onClick={handleExportPDF}
          >
            Exportar PDF
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
        {MONTH_PRESETS.map((preset) => (
          <MenuItem
            key={preset.key}
            onClick={() => handlePresetSelect(preset)}
            selected={selectedPreset === preset.key}
          >
            {preset.label}
          </MenuItem>
        ))}
      </Menu>

      {/* KPIs */}
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
        {metricsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              icon={AttachMoneyRounded}
              label="Receita total"
              value={formatBRL(metrics?.totalRevenue ?? 0)}
            />
            <MetricCard
              icon={ShoppingCartRounded}
              label="Total de vendas"
              value={String(metrics?.totalSales ?? 0)}
              trendLabel={presetLabel.toLowerCase()}
              isPositive={true}
            />
            <MetricCard
              icon={LocalFireDepartmentRounded}
              label="Ticket médio"
              value={formatBRL(metrics?.averageTicket ?? 0)}
            />
            <MetricCard
              icon={ReceiptLongRounded}
              label="Cancelamentos"
              value={String(metrics?.cancelledCount ?? 0)}
              trendLabel={
                cancellationRate !== null ? `${cancellationRate}% do total` : undefined
              }
              isPositive={false}
            />
          </>
        )}
      </Box>

      {/* Granularidade das séries temporais */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Agrupar por:
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={groupBy}
          onChange={(_, value) => {
            if (value) setGroupBy(value as GroupBy)
          }}
        >
          <ToggleButton value="day">Dia</ToggleButton>
          <ToggleButton value="week">Semana</ToggleButton>
          <ToggleButton value="month">Mês</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Gráficos */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
          <FinancialBarChart data={financial ?? []} loading={financialLoading} />
        </Box>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
          <AccumulatedProfitChart data={financial ?? []} loading={financialLoading} />
        </Box>

        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <RevenueLineChart data={financial ?? []} loading={financialLoading} />
        </Box>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <PaymentMethodPieChart data={byPayment ?? []} loading={paymentLoading} />
        </Box>

        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <OperatorRankingChart data={byOperator ?? []} loading={operatorLoading} />
        </Box>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <TopProductsChart data={topProducts ?? []} loading={productsLoading} />
        </Box>

        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <ExpensesByCategoryPieChart data={byCategory ?? []} loading={categoryLoading} />
        </Box>
      </Box>
    </Box>
  )
}
