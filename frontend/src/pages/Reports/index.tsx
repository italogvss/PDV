import { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import { formatBRL } from '../../utils/currency'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import {
  useSalesMetrics,
  useFinancialSummary,
  useSalesByOperator,
  useSalesByPaymentMethod,
  useTopProducts,
  useExpensesByCategory,
} from '../../hooks/useReports'
import type { RangePreset, GroupBy } from '../../types/report.types'
import FinancialBarChart from './components/FinancialBarChart'
import AccumulatedProfitChart from './components/AccumulatedProfitChart'
import RevenueLineChart from './components/RevenueLineChart'
import OperatorRankingChart from './components/OperatorRankingChart'
import TopProductsChart from './components/TopProductsChart'
import PaymentMethodPieChart from './components/PaymentMethodPieChart'
import ExpensesByCategoryPieChart from './components/ExpensesByCategoryPieChart'

// Janelas móveis a partir de hoje (sem snap pro início do mês).
const RANGE_PRESETS: RangePreset[] = [
  { label: 'Últimos 7 dias',   key: '7d',  amount: 7,  unit: 'day'   },
  { label: 'Últimos 30 dias',  key: '30d', amount: 30, unit: 'day'   },
  { label: 'Últimos 3 meses',  key: '3m',  amount: 3,  unit: 'month' },
  { label: 'Últimos 6 meses',  key: '6m',  amount: 6,  unit: 'month' },
  { label: 'Últimos 12 meses', key: '12m', amount: 12, unit: 'month' },
]

// Acima deste tamanho, agrupar por dia gera rótulos demais no eixo X.
const MAX_DAYS_FOR_DAY_GROUPING = 62

function suggestGroupBy(daysSpan: number): GroupBy {
  if (daysSpan <= 31) return 'day'
  if (daysSpan <= 92) return 'week'
  return 'month'
}

export default function ReportsPage() {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null)
  const [start, setStart] = useState<Dayjs>(dayjs().subtract(29, 'day'))
  const [end, setEnd] = useState<Dayjs>(dayjs())
  const [selectedPreset, setSelectedPreset] = useState<string | null>('30d')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const startDate = start.format('YYYY-MM-DD')
  const endDate = end.format('YYYY-MM-DD')

  const daysSpan = useMemo(
    () => end.startOf('day').diff(start.startOf('day'), 'day') + 1,
    [start, end],
  )

  // Ao trocar o período, reajusta a granularidade para uma escala adequada.
  // Alternar o toggle manualmente não mexe no span, então a escolha do usuário persiste.
  useEffect(() => {
    setGroupBy(suggestGroupBy(daysSpan))
  }, [daysSpan])

  const presetLabel = useMemo(
    () => RANGE_PRESETS.find((p) => p.key === selectedPreset)?.label ?? 'Personalizado',
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

  const handlePresetSelect = (preset: RangePreset) => {
    // Para dias, descontamos N-1 (a janela inclui hoje) → exatamente N dias.
    const back = preset.unit === 'day' ? preset.amount - 1 : preset.amount
    setStart(dayjs().subtract(back, preset.unit))
    setEnd(dayjs())
    setSelectedPreset(preset.key)
    setDateAnchor(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader title="Lucros & relatórios" description="Análise financeira detalhada">
        <Button
          variant="outlined"
          startIcon={<CalendarMonthOutlined />}
          endIcon={<ArrowDropDownRounded />}
          onClick={(e) => setDateAnchor(e.currentTarget)}
        >
          {presetLabel}
        </Button>
        <DatePicker
          label="De"
          format="DD/MM/YYYY"
          value={start}
          maxDate={end}
          onChange={(val) => {
            if (val) {
              setStart(val)
              setSelectedPreset(null)
            }
          }}
          slotProps={{ textField: { sx: { width: 150 } } }}
        />
        <DatePicker
          label="Até"
          format="DD/MM/YYYY"
          value={end}
          minDate={start}
          maxDate={dayjs()}
          onChange={(val) => {
            if (val) {
              setEnd(val)
              setSelectedPreset(null)
            }
          }}
          slotProps={{ textField: { sx: { width: 150 } } }}
        />
      </PageHeader>

      <Menu
        anchorEl={dateAnchor}
        open={Boolean(dateAnchor)}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {RANGE_PRESETS.map((preset) => (
          <MenuItem
            key={preset.key}
            onClick={() => handlePresetSelect(preset)}
            selected={selectedPreset === preset.key}
          >
            {preset.label}
          </MenuItem>
        ))}
      </Menu>

      {metricsLoading ? (
        <PageKpiGrid>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </PageKpiGrid>
      ) : (
        <PageKpiGrid>
          <PageKpiCard
            icon={AttachMoneyRounded}
            label="Receita total"
            value={formatBRL(metrics?.totalRevenue ?? 0)}
          />
          <PageKpiCard
            icon={ShoppingCartRounded}
            label="Total de vendas"
            value={String(metrics?.totalSales ?? 0)}
          />
          <PageKpiCard
            icon={LocalFireDepartmentRounded}
            label="Ticket médio"
            value={formatBRL(metrics?.averageTicket ?? 0)}
          />
          <PageKpiCard
            icon={ReceiptLongRounded}
            label="Cancelamentos"
            value={String(metrics?.cancelledCount ?? 0)}
            badge={
              cancellationRate !== null
                ? { label: `${cancellationRate}% do total`, color: 'error', icon: TrendingDownRounded }
                : undefined
            }
          />
        </PageKpiGrid>
      )}

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
          <ToggleButton value="day" disabled={daysSpan > MAX_DAYS_FOR_DAY_GROUPING}>
            Dia
          </ToggleButton>
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
