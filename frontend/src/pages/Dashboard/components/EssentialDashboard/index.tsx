import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import { Box } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import PageKpiCard from '../../../../components/PageKpiCard'
import UpsellCard from '../../../../components/UpsellCard'
import { useSales } from '../../../../hooks/useSales'
import { formatBRL } from '../../../../utils/currency'
import EmployeeDashboard from '../EmployeeDashboard'

// Dashboard do plano Essencial (feature `advancedDashboard` = false): sem os KPIs de estoque,
// despesas e lucro (que dependem de relatórios Pro). Mostra só o faturamento do mês — calculado
// a partir do módulo de vendas, que não é gateado — e um card de upsell no lugar do ranking de
// produtos, que exige relatórios avançados.
export default function EssentialDashboard() {
  const { data: sales, isLoading } = useSales()

  const { revenue, count } = useMemo(() => {
    const monthStart = dayjs().startOf('month')
    const valid = (sales ?? []).filter(
      (sale) => sale.status !== 'Cancelled' && dayjs(sale.createdAt).isAfter(monthStart),
    )
    return {
      revenue: valid.reduce((sum, sale) => sum + sale.total, 0),
      count: valid.length,
    }
  }, [sales])

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <PageKpiCard
          icon={ShoppingCartRounded}
          label={`Faturamento em ${monthLabel}`}
          value={formatBRL(revenue)}
          isLoading={isLoading}
          badge={{ label: `${count} vendas`, color: 'success', icon: TrendingUpRounded }}
        />
        <UpsellCard
          title="Produto mais vendido no Pro"
          description="Descubra seus campeões de venda, ranking de produtos e painel analítico completo com o plano Pro."
        />
      </Box>

      <EmployeeDashboard />
    </Box>
  )
}
