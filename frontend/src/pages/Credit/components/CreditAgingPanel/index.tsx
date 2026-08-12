import { Box, Skeleton, useTheme } from '@mui/material'
import DonutChart from '../../../../components/DonutChart'
import RankingList from '../../../../components/RankingList'
import { useCreditAging } from '../../../../hooks/useCredit'
import { formatBRL } from '../../../../utils/currency'

// Painel analítico do crediário (feature Pro `creditDashboard`). O hook já não dispara a
// requisição sem a feature — quem não tem o plano vê o UpsellCard renderizado pela página.
export default function CreditAgingPanel() {
  const { data, isLoading } = useCreditAging()
  const theme = useTheme()

  if (isLoading) return <Skeleton variant="rounded" height={260} />
  if (!data) return null

  // Rampa de severidade: quanto mais velha a faixa, mais próxima do vermelho.
  const bucketColors = [
    theme.palette.success.main,
    theme.palette.data.yellow.main,
    theme.palette.data.orange.main,
    theme.palette.error.main,
    theme.palette.error.dark,
  ]

  const segments = data.buckets.map((bucket, index) => ({
    label: bucket.label,
    value: bucket.amount,
    color: bucketColors[index] ?? theme.palette.error.main,
  }))

  const debtorItems = data.topDebtors.map((debtor) => ({
    id: debtor.customerId,
    label: debtor.customerName,
    value: debtor.balance,
    primaryText: formatBRL(debtor.balance),
    secondaryText: debtor.overdueAmount > 0 ? `${formatBRL(debtor.overdueAmount)} vencido` : undefined,
  }))

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <DonutChart
        title="Idade da carteira"
        subtitle={`Inadimplência de ${data.defaultRate.toLocaleString('pt-BR')}% sobre ${formatBRL(data.totalReceivable)} a receber`}
        info="Fonte: saldo das parcelas em aberto, separado por quantos dias já passaram do vencimento. 'A vencer' inclui as que vencem hoje — o cliente ainda tem o dia. Parcela de crediário cancelado fica de fora: virou perda, não é mais cobrável. Inadimplência = vencido ÷ total a receber."
        segments={segments}
        showTotal
        totalLabel="A receber"
      />

      <RankingList
        title="Maiores devedores"
        subtitle="Clientes com maior saldo em aberto"
        info="Top 10 clientes por saldo em aberto, somando todas as contas de crediário de cada um. O valor em destaque é o saldo total; abaixo, quanto dele já está vencido."
        items={debtorItems}
        emptyText="Nenhum saldo em aberto."
      />
    </Box>
  )
}
