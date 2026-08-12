import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import GroupOutlined from '@mui/icons-material/GroupOutlined'
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined'
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined'
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined'
import AttachMoneyRounded from '@mui/icons-material/AttachMoneyRounded'
import EventBusyRounded from '@mui/icons-material/EventBusyRounded'
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import PercentRounded from '@mui/icons-material/PercentRounded'
import PriceCheckRounded from '@mui/icons-material/PriceCheckRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import { Box, Skeleton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'
import PageKpiCard, { PageKpiGrid } from '../../../components/PageKpiCard'
import { useUserPermissions } from '../../../hooks/useUserPermissions'
import {
  useAppointmentPeakHours,
  useAppointmentSummary,
  useAppointmentsByEmployee,
  useCreditReportAging,
  useCreditReportSummary,
  useFinancialSummary,
  useReceivableSchedule,
  useRevenueByType,
  useSalesByOperator,
  useSalesByPaymentMethod,
  useSalesMetrics,
  useServiceCategoryRevenue,
  useTopCustomers,
  useTopProducts,
  useTopServices,
} from '../../../hooks/useReports'
import type { GroupBy, ReportBasis } from '../../../types/report.types'
import { formatBRL } from '../../../utils/currency'
import AccumulatedProfitChart from './AccumulatedProfitChart'
import AppointmentRevenueChart from './AppointmentRevenueChart'
import AppointmentStatusDonut from './AppointmentStatusDonut'
import AppointmentsOverTimeChart from './AppointmentsOverTimeChart'
import CreditAgingPanel from './CreditAgingPanel'
import CustomersListPanel from './CustomersListPanel'
import EmployeeAppointmentsRanking from './EmployeeAppointmentsRanking'
import EmployeeListGrid from './EmployeeListGrid'
import FinancialBarChart from './FinancialBarChart'
import OperatorRankingChart from './OperatorRankingChart'
import PaymentMethodPieChart from './PaymentMethodPieChart'
import PeakHoursChart from './PeakHoursChart'
import ReceivableScheduleChart from './ReceivableScheduleChart'
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
  basis: ReportBasis
  onBasisChange: (basis: ReportBasis) => void
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
  basis,
  onBasisChange,
}: ReportsContentProps) {
  const { isModuleEnabled } = useUserPermissions()

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(startDate, endDate)
  const { data: financial, isLoading: financialLoading } = useFinancialSummary(
    startDate,
    endDate,
    groupBy,
    basis,
  )
  const { data: prevFinancial, isLoading: prevFinancialLoading } = useFinancialSummary(
    prevStartDate,
    prevEndDate,
    groupBy,
    basis,
  )
  const { data: byOperator, isLoading: operatorLoading } = useSalesByOperator(startDate, endDate)
  const { data: byPayment, isLoading: paymentLoading } = useSalesByPaymentMethod(
    startDate,
    endDate,
    basis,
  )
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
  const { data: creditSummary, isLoading: creditSummaryLoading } = useCreditReportSummary(
    startDate,
    endDate,
  )
  const { data: creditAging, isLoading: creditAgingLoading } = useCreditReportAging()
  const { data: receivableSchedule, isLoading: receivableScheduleLoading } = useReceivableSchedule(
    startDate,
    endDate,
    groupBy,
  )

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
  const showCredit = isModuleEnabled('credit')

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
              <Tooltip title="COMPETÊNCIA: a venda conta inteira na data da venda e a despesa no vencimento. CAIXA: só o dinheiro que entrou — venda fiado conta a entrada no dia da venda e cada parcela na data da baixa; despesa conta na data do pagamento. Sem crediário os dois regimes dão o mesmo resultado. Afeta: composição do resultado, receita × lucro, lucro acumulado, receita ao longo do tempo, formas de pagamento e a margem média. NÃO afeta: KPIs Receita/Recebido/A receber, rankings de produto, operador e cliente, serviços × produtos e a seção Agendamentos.">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                    Regime
                  </Typography>

                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={basis}
                    onChange={(_, value) => {
                      if (value) onBasisChange(value as ReportBasis)
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
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={120} />
                ))}
              </PageKpiGrid>
            ) : (
              <PageKpiGrid>
                <PageKpiCard
                  icon={AttachMoneyRounded}
                  label="Receita total"
                  value={formatBRL(metrics?.totalRevenue ?? 0)}
                  tooltip="Σ do total das vendas ativas do período, já com desconto. Tudo que foi VENDIDO, tenha o dinheiro entrado ou não — uma venda fiado entra aqui inteira no dia da venda. Sempre por competência: não muda com o toggle Regime. Receita total = Recebido + A receber + perdas de crediário."
                />
                {/* Recebido/A receber são fatos das vendas do período, não do regime escolhido —
                    por isso continuam visíveis nos dois modos do toggle. */}
                <PageKpiCard
                  icon={PriceCheckRounded}
                  label="Recebido"
                  value={formatBRL(metrics?.receivedRevenue ?? 0)}
                  tooltip="Quanto das VENDAS DO PERÍODO já virou dinheiro: vendas à vista integrais + entrada do crediário + parcelas já baixadas (inclusive baixadas depois do período — a venda é a mesma). Não é 'dinheiro que entrou no período': para isso, troque o Regime para Caixa ou veja a seção Crediário."
                />
                <PageKpiCard
                  icon={ScheduleRounded}
                  label="A receber"
                  value={formatBRL(metrics?.outstandingRevenue ?? 0)}
                  tooltip="Σ do saldo das parcelas em aberto das vendas do período (valor da parcela − o que já foi pago nela). Parcela de crediário cancelado NÃO entra: virou perda, não é mais cobrável. Zero aqui significa que tudo que foi vendido no período já foi recebido."
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
                  tooltip="Resultado líquido total ÷ receita total do período. A margem considera só itens com custo cadastrado (produtos sem custo entram na receita, mas não no lucro), então tende a ficar subestimada quanto mais produtos sem custo houver. Segue o regime selecionado."
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
                <SalesCompositionChart data={financial ?? []} basis={basis} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <SalesCompositionDonut data={financial ?? []} basis={basis} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                <FinancialBarChart data={financial ?? []} basis={basis} loading={financialLoading} />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <AccumulatedProfitChart data={financial ?? []} basis={basis} loading={financialLoading} />
              </Box>

              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                <RevenueLineChart
                  data={financial ?? []}
                  basis={basis}
                  prevData={prevFinancial ?? []}
                  loading={financialLoading || prevFinancialLoading}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                <PaymentMethodPieChart data={byPayment ?? []} basis={basis} loading={paymentLoading} />
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

      {showCredit && (
        <ReportSection
          icon={AccountBalanceWalletOutlined}
          title="Crediário"
          subtitle="Carteira a receber, inadimplência e previsão de entrada"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {creditSummaryLoading ? (
              <PageKpiGrid>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={120} />
                ))}
              </PageKpiGrid>
            ) : (
              <PageKpiGrid>
                <PageKpiCard
                  icon={ReceiptLongRounded}
                  label="Fiado no período"
                  value={formatBRL(creditSummary?.invoiced ?? 0)}
                  tooltip="Σ do valor financiado das vendas em crediário fechadas no período — total da venda MENOS a entrada, já que a entrada foi paga à vista. É quanto de dívida nova a loja criou no período."
                />
                <PageKpiCard
                  icon={PriceCheckRounded}
                  label="Recebido no período"
                  value={formatBRL(creditSummary?.received ?? 0)}
                  tooltip="Dinheiro de crediário que ENTROU no período: baixas de parcela registradas no período (de vendas de qualquer época, inclusive antigas) + entradas pagas nas vendas fiado fechadas no período. Diferente do KPI 'Recebido' da seção Vendas, que olha para as vendas do período, não para o caixa do período."
                />
                <PageKpiCard
                  icon={ScheduleRounded}
                  label="A receber"
                  value={formatBRL(creditSummary?.outstanding ?? 0)}
                  tooltip="Σ do saldo de TODAS as parcelas em aberto da loja. É a posição de HOJE e não muda com o período escolhido no calendário — dívida viva não é um fato de intervalo. Parcela de crediário cancelado não entra."
                />
                <PageKpiCard
                  icon={EventBusyRounded}
                  label="Vencido"
                  value={formatBRL(creditSummary?.overdue ?? 0)}
                  tooltip={`Parte do "A receber" cujas parcelas já passaram do vencimento${
                    creditSummary ? ` — ${creditSummary.overdueInstallments} parcela(s)` : ''
                  }. Calculado na hora (vencimento anterior a hoje), nunca um status gravado. Posição de hoje, não do período.`}
                />
                <PageKpiCard
                  icon={TrendingDownRounded}
                  label="Perdas no período"
                  value={formatBRL(creditSummary?.writtenOff ?? 0)}
                  tooltip="Saldo que ficou de pé nos crediários CANCELADOS no período — cobrança encerrada, dinheiro que não vai entrar. A receita da venda continua contada em Competência (a venda aconteceu); no regime de Caixa esse valor simplesmente nunca entra. Crediários cancelados antes desta versão não têm data de cancelamento registrada e não aparecem aqui."
                />
                <PageKpiCard
                  icon={PercentRounded}
                  label="Inadimplência"
                  value={`${(creditSummary?.defaultRate ?? 0).toLocaleString('pt-BR')}%`}
                  tooltip="Vencido ÷ A receber, sobre a carteira de hoje. Mede a qualidade do que está em aberto, não o histórico: uma dívida que virou perda sai da conta (some dos dois lados) e por isso pode fazer o índice cair."
                />
              </PageKpiGrid>
            )}

            <ReceivableScheduleChart
              data={receivableSchedule ?? []}
              loading={receivableScheduleLoading}
            />

            <CreditAgingPanel data={creditAging} loading={creditAgingLoading} />
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
