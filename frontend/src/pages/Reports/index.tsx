import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import GroupOutlined from '@mui/icons-material/GroupOutlined'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import PercentRounded from '@mui/icons-material/PercentRounded'
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import PageKpiCard, { PageKpiGrid } from '../../components/PageKpiCard'
import {
  useAppointmentPeakHours,
  useAppointmentSummary,
  useAppointmentsByEmployee,
  useFinancialSummary,
  useRevenueByType,
  useSalesByOperator,
  useSalesByPaymentMethod,
  useSalesMetrics,
  useServiceCategoryRevenue,
  useTopCustomers,
  useTopProducts,
  useTopServices
} from '../../hooks/useReports'
import type { ExpenseBasis, GroupBy, RangePreset } from '../../types/report.types'
import { formatBRL } from '../../utils/currency'
import AccumulatedProfitChart from './components/AccumulatedProfitChart'
import AppointmentRevenueChart from './components/AppointmentRevenueChart'
import AppointmentStatusDonut from './components/AppointmentStatusDonut'
import AppointmentsOverTimeChart from './components/AppointmentsOverTimeChart'
import CustomersListPanel from './components/CustomersListPanel'
import EmployeeAppointmentsRanking from './components/EmployeeAppointmentsRanking'
import EmployeeListGrid from './components/EmployeeListGrid'
import FinancialBarChart from './components/FinancialBarChart'
import OperatorRankingChart from './components/OperatorRankingChart'
import PaymentMethodPieChart from './components/PaymentMethodPieChart'
import PeakHoursChart from './components/PeakHoursChart'
import ReportSection from './components/ReportSection'
import RevenueByTypeDonut from './components/RevenueByTypeDonut'
import RevenueLineChart from './components/RevenueLineChart'
import SalesCompositionChart from './components/SalesCompositionChart'
import SalesCompositionDonut from './components/SalesCompositionDonut'
import ServiceCategoryDonut from './components/ServiceCategoryDonut'
import TopCustomersRanking from './components/TopCustomersRanking'
import TopProductsChart from './components/TopProductsChart'
import TopServicesRanking from './components/TopServicesRanking'

// Janelas móveis a partir de hoje (sem snap pro início do mês).
const RANGE_PRESETS: RangePreset[] = [
  { label: 'Últimos 7 dias', key: '7d', amount: 7, unit: 'day' },
  { label: 'Últimos 30 dias', key: '30d', amount: 30, unit: 'day' },
  { label: 'Últimos 3 meses', key: '3m', amount: 3, unit: 'month' },
  { label: 'Últimos 6 meses', key: '6m', amount: 6, unit: 'month' },
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
  const [expenseBasis, setExpenseBasis] = useState<ExpenseBasis>('accrual')

  const startDate = start.format('YYYY-MM-DD')
  const endDate = end.format('YYYY-MM-DD')

  const daysSpan = useMemo(
    () => end.startOf('day').diff(start.startOf('day'), 'day') + 1,
    [start, end],
  )

  // Período anterior equivalente: mesma duração, deslocado para trás
  const prevEnd = useMemo(() => start.subtract(1, 'day'), [start])
  const prevStart = useMemo(() => prevEnd.subtract(daysSpan - 1, 'day'), [prevEnd, daysSpan])
  const prevStartDate = prevStart.format('YYYY-MM-DD')
  const prevEndDate = prevEnd.format('YYYY-MM-DD')

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
    expenseBasis,
  )
  const { data: prevFinancial, isLoading: prevFinancialLoading } = useFinancialSummary(
    prevStartDate,
    prevEndDate,
    groupBy,
    expenseBasis,
  )
  const { data: byOperator, isLoading: operatorLoading } = useSalesByOperator(startDate, endDate)
  const { data: byPayment, isLoading: paymentLoading } = useSalesByPaymentMethod(startDate, endDate)
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(startDate, endDate)
  const { data: revenueByType, isLoading: revenueByTypeLoading } = useRevenueByType(startDate, endDate)
  const { data: appointmentSummary, isLoading: appointmentSummaryLoading } = useAppointmentSummary(
    startDate,
    endDate,
    groupBy,
  )
  const { data: topServices, isLoading: topServicesLoading } = useTopServices(startDate, endDate)
  const { data: byEmployee, isLoading: byEmployeeLoading } = useAppointmentsByEmployee(startDate, endDate)
  const { data: categoryRevenue, isLoading: categoryRevenueLoading } = useServiceCategoryRevenue(
    startDate,
    endDate,
  )
  const { data: peakHours, isLoading: peakHoursLoading } = useAppointmentPeakHours(startDate, endDate)
  const { data: topCustomers, isLoading: topCustomersLoading } = useTopCustomers(startDate, endDate)

  // Margem de lucro média = resultado líquido total / receita total
  const avgProfitMargin = useMemo(() => {
    if (!financial || financial.length === 0) return null
    const totalRevenue = financial.reduce((sum, d) => sum + d.revenue, 0)
    const totalNetResult = financial.reduce((sum, d) => sum + d.netResult, 0)
    if (totalRevenue === 0) return null
    return ((totalNetResult / totalRevenue) * 100).toFixed(1)
  }, [financial])

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
          slotProps={{ textField: { sx: { width: 180 } } }}
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
          slotProps={{ textField: { sx: { width: 180 } } }}
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ReportSection
          icon={PointOfSaleOutlined}
          title="Vendas"
          subtitle="Receita, produtos, pagamentos e desempenho no período"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Granularidade das séries temporais + regime das despesas */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'end',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Tooltip title="Competência conta as despesas pela data de vencimento; Caixa conta só as despesas já pagas, pela data de pagamento. Afeta os gráficos de composição, lucro líquido e lucro acumulado.">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                    Despesas por
                  </Typography>

                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={expenseBasis}
                    onChange={(_, value) => {
                      if (value) setExpenseBasis(value as ExpenseBasis)
                    }}
                  >
                    <ToggleButton value="accrual">Competência</ToggleButton>
                    <ToggleButton value="cash">Caixa</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Tooltip>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Agrupar por
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
            </Box>
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
                  icon={PercentRounded}
                  label="Margem de lucro média"
                  value={avgProfitMargin !== null ? `${avgProfitMargin}%` : '—'}
                  isLoading={financialLoading}
                  tooltip="Resultado líquido total ÷ receita total do período. A margem considera só itens com custo cadastrado (produtos sem custo entram na receita, mas não no lucro), então tende a ficar subestimada quanto mais produtos sem custo houver."
                />
              </PageKpiGrid>
            )}

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
                alignItems: 'stretch',
              }}
            >
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                <SalesCompositionChart data={financial ?? []} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <SalesCompositionDonut data={financial ?? []} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                <FinancialBarChart data={financial ?? []} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <AccumulatedProfitChart data={financial ?? []} loading={financialLoading} />
              </Box>

              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                <RevenueLineChart
                  data={financial ?? []}
                  prevData={prevFinancial ?? []}
                  loading={financialLoading || prevFinancialLoading}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <PaymentMethodPieChart data={byPayment ?? []} loading={paymentLoading} />

              </Box>

              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
                <RevenueByTypeDonut data={revenueByType} loading={revenueByTypeLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
                <TopProductsChart data={topProducts ?? []} loading={productsLoading} />
              </Box>

            </Box>
          </Box>
        </ReportSection>

        <ReportSection
          icon={GroupOutlined}
          title="Funcionário"
          subtitle="Equipe, salários e desempenho de vendas por operador"
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 7' } }}>
              <EmployeeListGrid />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 5' } }}>
              <OperatorRankingChart data={byOperator ?? []} loading={operatorLoading} />
            </Box>
          </Box>
        </ReportSection>

        <ReportSection
          icon={CalendarMonthOutlined}
          title="Agendamentos"
          subtitle="Inclui serviços"
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
              <AppointmentsOverTimeChart data={appointmentSummary ?? []} loading={appointmentSummaryLoading} />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
              <AppointmentStatusDonut data={appointmentSummary ?? []} loading={appointmentSummaryLoading} />
            </Box>

            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
              <AppointmentRevenueChart data={appointmentSummary ?? []} loading={appointmentSummaryLoading} />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
              <ServiceCategoryDonut data={categoryRevenue ?? []} loading={categoryRevenueLoading} />
            </Box>

            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
              <TopServicesRanking data={topServices ?? []} loading={topServicesLoading} />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
              <EmployeeAppointmentsRanking data={byEmployee ?? []} loading={byEmployeeLoading} />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <PeakHoursChart data={peakHours ?? []} loading={peakHoursLoading} />
            </Box>
          </Box>
        </ReportSection>

        <ReportSection
          icon={PeopleAltOutlined}
          title="Clientes"
          subtitle="Cadastro e receita por cliente"
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 7' } }}>
              <CustomersListPanel />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 5' } }}>
              <TopCustomersRanking data={topCustomers ?? []} loading={topCustomersLoading} />
            </Box>
          </Box>
        </ReportSection>
      </Box>
    </Box>
  )
}
