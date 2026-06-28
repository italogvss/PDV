import { useState } from 'react'
import { CancelOutlined } from '@mui/icons-material'
import { Box, Card, CardContent, Skeleton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import type { EmployeeCancellation } from '../../../../services/employee.service'

interface Props {
  cancellation: EmployeeCancellation | undefined
  isLoading: boolean
}

type Scope = 'month' | 'total'

export default function CancellationRateKpi({ cancellation, isLoading }: Props) {
  const [scope, setScope] = useState<Scope>('total')

  if (isLoading) return <Skeleton variant="rounded" height={120} />

  const cancelled = scope === 'month' ? cancellation?.monthCancelled ?? 0 : cancellation?.totalCancelled ?? 0
  const total = scope === 'month' ? cancellation?.monthTotal ?? 0 : cancellation?.total ?? 0
  const rate = total > 0 ? (cancelled / total) * 100 : 0
  const valueColor = rate >= 25 ? 'error.main' : rate >= 10 ? 'warning.main' : 'text.primary'

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <CancelOutlined sx={{ fontSize: 15, color: 'text.tertiary' }} />
            <Typography variant="caption" sx={{ color: 'text.tertiary' }} noWrap>
              Taxa de cancelamento
            </Typography>
          </Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={scope}
            onChange={(_, v: Scope | null) => v && setScope(v)}
          >
            <ToggleButton value="month" sx={{ px: 1, py: 0, fontSize: 11, textTransform: 'none' }}>
              Mês
            </ToggleButton>
            <ToggleButton value="total" sx={{ px: 1, py: 0, fontSize: 11, textTransform: 'none' }}>
              Total
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography
          color={valueColor}
          sx={{ lineHeight: 1, typography: { xs: 'h2', sm: 'h1' } }}
        >
          {total > 0 ? `${rate.toFixed(1).replace('.', ',')}%` : '—'}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {cancelled} de {total} {scope === 'month' ? 'neste mês' : 'no total'}
        </Typography>
      </CardContent>
    </Card>
  )
}
