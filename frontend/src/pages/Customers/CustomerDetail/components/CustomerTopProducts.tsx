import { Box, Card, CardContent, Divider, Skeleton, Typography } from '@mui/material'
import type { CustomerCrmStats } from '../../../../services/customer.service'
import { formatBRL } from '../../../../utils/currency'

interface Props {
  stats: CustomerCrmStats | undefined
  statsLoading: boolean
}

export default function CustomerTopProducts({ stats, statsLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Top produtos comprados
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Por volume · todos os períodos
        </Typography>
      </CardContent>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        {statsLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
          </Box>
        ) : stats && stats.topProducts.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats.topProducts.map((p, idx) => (
              <Box key={p.productName}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: idx === 0 ? 'warning.main' : idx === 1 ? 'text.secondary' : 'action.selected',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'common.white', lineHeight: 1 }}>
                      {idx + 1}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {p.productName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {p.quantity}×
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                    {formatBRL(p.totalSpent)}
                  </Typography>
                </Box>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden', ml: 4.5 }}>
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: 'success.main',
                      width: `${(p.quantity / p.maxQuantity) * 100}%`,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">Nenhuma compra registrada</Typography>
        )}
      </Box>
    </Card>
  )
}
