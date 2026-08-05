import { Box, Card, CardContent, LinearProgress, Skeleton, Typography } from '@mui/material'
import { useCreditAging } from '../../../../hooks/useCredit'
import { formatBRL } from '../../../../utils/currency'

// Painel analítico do crediário (feature Pro `creditDashboard`). O hook já não dispara a
// requisição sem a feature — quem não tem o plano vê o UpsellCard renderizado pela página.
export default function CreditAgingPanel() {
  const { data, isLoading } = useCreditAging()

  if (isLoading) return <Skeleton variant="rounded" height={260} />
  if (!data) return null

  const maxBucket = Math.max(...data.buckets.map((b) => b.amount), 1)

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Idade da carteira
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Inadimplência de {data.defaultRate.toLocaleString('pt-BR')}% sobre{' '}
            {formatBRL(data.totalReceivable)} a receber
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {data.buckets.map((bucket) => (
              <Box key={bucket.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {bucket.label}
                    {bucket.installmentCount > 0 && ` (${bucket.installmentCount})`}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatBRL(bucket.amount)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(bucket.amount / maxBucket) * 100}
                  color={bucket.label === 'A vencer' ? 'success' : 'error'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Maiores devedores
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Clientes com maior saldo em aberto
          </Typography>

          {data.topDebtors.length === 0 && (
            <Typography variant="body2" color="text.tertiary">
              Nenhum saldo em aberto.
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {data.topDebtors.map((debtor) => (
              <Box
                key={debtor.customerId}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {debtor.customerName}
                  </Typography>
                  {debtor.overdueAmount > 0 && (
                    <Typography variant="caption" color="error.main">
                      {formatBRL(debtor.overdueAmount)} vencido
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', pl: 2 }}>
                  {formatBRL(debtor.balance)}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
