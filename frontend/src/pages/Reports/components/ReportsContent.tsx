import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import GroupOutlined from '@mui/icons-material/GroupOutlined'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import PercentRounded from '@mui/icons-material/PercentRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import { Box, Skeleton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import { useUserPermissions } from '../../../hooks/useUserPermissions'
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
  useTopServices,
} from '../../../hooks/useReports'
import type { ExpenseBasis, GroupBy } from '../../../types/report.types'
import { formatBRL } from '../../../utils/currency'
import AccumulatedProfitChart from './AccumulatedProfitChart'
import AppointmentRevenueChart from './AppointmentRevenueChart'
import AppointmentStatusDonut from './AppointmentStatusDonut'
import AppointmentsOverTimeChart from './AppointmentsOverTimeChart'
import CustomersListPanel from './CustomersListPanel'
import EmployeeAppointmentsRanking from './EmployeeAppointmentsRanking'
import EmployeeListGrid from './EmployeeListGrid'
import FinancialBarChart from './FinancialBarChart'
import OperatorRankingChart from './OperatorRankingChart'
import PaymentMethodPieChart from './PaymentMethodPieChart'
import PeakHoursChart from './PeakHoursChart'
import ReportSection from './ReportSection'
import RevenueByTypeDonut from './RevenueByTypeDonut'
import RevenueLineChart from './RevenueLineChart'
import SalesCompositionChart from './SalesCompositionChart'
import SalesCompositionDonut from './SalesCompositionDonut'
import ServiceCategoryDonut from './ServiceCategoryDonut'
import TopCustomersRanking from './TopCustomersRanking'
import TopProductsChart from './TopProductsChart'
import TopServicesRanking from './TopServicesRanking'

// Acima deste tamanho, agrupar por dia gera rótulos demais no eixo X.
const MAX_DAYS_FOR_DAY_GROUPING = 62

export interface ReportsContentProps {
  startDate: string
  endDate: string
  prevStartDate: string
  prevEndDate: string
  daysSpan: number
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  expenseBasis: ExpenseBasis
  onExpenseBasisChange: (basis: ExpenseBasis) => void
}

// Conteúdo com os 4 accordions de relatório — só monta quando o plano tem `advancedReports`
// (ver Reports/index.tsx), para que os hooks de relatório (todos atrás de
// `[RequireEntitlement(AdvancedReports)]` no backend) não disparem sem a feature.
export default function ReportsContent({
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  daysSpan,
  groupBy,
  onGroupByChange,
  expenseBasis,
  onExpenseBasisChange,
}: ReportsContentProps) {
  const { isModuleEnabled } = useUserPermissions()

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

  const showSales = isModuleEnabled('sales')
  const showEmployees = isModuleEnabled('employees')
  const showAppointments = isModuleEnabled('appointments') || isModuleEnabled('services')
  const showCustomers = isModuleEnabled('customers')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {showSales && (
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
                      if (value) onExpenseBasisChange(value as ExpenseBasis)
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
                    if (value) onGroupByChange(value as GroupBy)
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
      )}

      {showEmployees && (
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
      )}

      {showAppointments && (
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
      )}

      {showCustomers && (
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
      )}
    </Box>
  )
}
