import { Box, Fade } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useFinancialSummary,
  useSalesByPaymentMethod,
  useTopProducts,
} from '../../../../hooks/useReports'
import { useSales } from '../../../../hooks/useSales'
import { useTenantSettings } from '../../../../hooks/useTenantSettings'
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

  const { data: financialSummary, isLoading: financialLoading } = useFinancialSummary(startDate, endDate, 'day')
  const { data: paymentMethods, isLoading: paymentsLoading } = useSalesByPaymentMethod(startDate, endDate)
  const { data: topProducts, isLoading: topProductsLoading } = useTopProducts(monthStart, endDate, 5)
  const { data: sales, isLoading: salesLoading } = useSales()
  const { data: settings } = useTenantSettings()

  const todaySales = useMemo(() => {
    const today = dayjs().startOf('day')
    return (sales ?? [])
      .filter((sale) => dayjs(sale.createdAt).isSame(today, 'day'))
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 6)
  }, [sales])

  return (
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
  )
}
