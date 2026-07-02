import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import { Box, Fade, Skeleton } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageKpiCard, { PageKpiGrid } from '../../../../components/PageKpiCard'
import { useProducts } from '../../../../hooks/useProducts'
import {
  useExpensesByCategory,
  useFinancialSummary,
  useSalesByPaymentMethod,
  useSalesMetrics,
  useTopProducts,
} from '../../../../hooks/useReports'
import { useSales } from '../../../../hooks/useSales'
import { useTenantSettings } from '../../../../hooks/useTenantSettings'
import { formatBRL } from '../../../../utils/currency'
import ActiveTeamCard from '../ActiveTeamCard'
import PaymentMethodsDonut from '../PaymentMethodsDonut'
import PendingBillsCard from '../PendingBillsCard'
import RecentSalesTable from '../RecentSalesTable'
import RevenueAreaChart from '../RevenueAreaChart'
import StockAlertsCard from '../StockAlertsCard'
import TopProductsRanking from '../TopProductsRanking'
import type { Props } from './types'

// Painel analítico completo (feature Pro `advancedDashboard`): KPIs financeiros + gráficos que
// dependem do módulo de relatórios. Fica num componente próprio para que os hooks de relatório
// só disparem quando o plano tem direito — o plano Essencial renderiza EssentialDashboard.
export default function AnalyticsDashboard({ selectedDays }: Props) {
  const navigate = useNavigate()

  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = useMemo(
    () => dayjs().subtract(selectedDays, 'day').format('YYYY-MM-DD'),
    [selectedDays],
  )
  const monthStart = useMemo(() => dayjs().startOf('month').format('YYYY-MM-DD'), [])

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(startDate, endDate)
  const { data: products } = useProducts()
  const { data: expensesByCategory, isLoading: expensesLoading } = useExpensesByCategory(startDate, endDate)
  const { data: financialSummary, isLoading: financialLoading } = useFinancialSummary(startDate, endDate, 'day')
  const { data: paymentMethods, isLoading: paymentsLoading } = useSalesByPaymentMethod(startDate, endDate)
  const { data: topProducts, isLoading: topProductsLoading } = useTopProducts(monthStart, endDate, 5)
  const { data: sales, isLoading: salesLoading } = useSales()
  const { data: settings } = useTenantSettings()

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

  const todaySales = useMemo(() => {
    const today = dayjs().startOf('day')
    return (sales ?? [])
      .filter((sale) => dayjs(sale.createdAt).isSame(today, 'day'))
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 6)
  }, [sales])

  return (
    <>
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
            label="Faturamento"
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
            label="Despesas"
            value={formatBRL(totalExpenses)}
            badge={{ label: `${selectedDays} dias`, color: 'warning', icon: TrendingDownRounded }}
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

      <Fade in timeout={400}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
            <RevenueAreaChart data={financialSummary ?? []} days={selectedDays} loading={financialLoading} />
            <PaymentMethodsDonut
              data={paymentMethods ?? []}
              payments={settings?.payments}
              loading={paymentsLoading}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <RecentSalesTable sales={todaySales} loading={salesLoading} onViewAll={() => navigate('/historico')} />
            <TopProductsRanking products={topProducts ?? []} loading={topProductsLoading} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <StockAlertsCard />
            <PendingBillsCard />
            <ActiveTeamCard />
          </Box>
        </Box>
      </Fade>
    </>
  )
}
