import { Box, Typography, useTheme } from '@mui/material'
import type { Theme } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import ChartCard from '../../Reports/components/ChartCard'
import { formatBRL } from '../../../utils/currency'
import type { SalesByPaymentMethod } from '../../../types/report.types'
import type { PaymentsSettings } from '../../../types/settings.types'

export interface PaymentMethodsDonutProps {
  data: SalesByPaymentMethod[]
  payments?: PaymentsSettings
  loading?: boolean
}

// Mapeia cada método (enum do backend) ao flag de habilitado, rótulo e cor fixa (casa com a imagem).
interface MethodConfig {
  key: string
  label: string
  enabled: (p: PaymentsSettings) => boolean
  color: (theme: Theme) => string
}

const METHODS: MethodConfig[] = [
  { key: 'PIX', label: 'Pix', enabled: (p) => p.pix.enabled, color: (t) => t.palette.success.main },
  { key: 'CreditCard', label: 'Cartão crédito', enabled: (p) => p.cardCredit.enabled, color: (t) => t.palette.info.main },
  { key: 'Cash', label: 'Dinheiro', enabled: (p) => p.cash.enabled, color: (t) => t.palette.neutral[500] },
  { key: 'DebitCard', label: 'Débito', enabled: (p) => p.cardDebit.enabled, color: (t) => t.palette.warning.main },
]

export default function PaymentMethodsDonut({ data, payments, loading = false }: PaymentMethodsDonutProps) {
  const theme = useTheme()

  const totalsByKey = new Map(data.map((d) => [d.paymentMethod, d.total]))

  // Só métodos habilitados no tenant; se payments ainda não carregou, mostra todos.
  const rows = METHODS.filter((m) => (payments ? m.enabled(payments) : true)).map((m) => ({
    key: m.key,
    label: m.label,
    color: m.color(theme),
    amount: totalsByKey.get(m.key) ?? 0,
  }))

  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  const isEmpty = total === 0

  return (
    <ChartCard title="Formas de pagamento" loading={loading} isEmpty={isEmpty}>
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <PieChart
          height={200}
          width={200}
          hideLegend
          series={[
            {
              data: rows.map((r) => ({ id: r.key, value: r.amount, label: r.label, color: r.color })),
              innerRadius: 64,
              outerRadius: 96,
              paddingAngle: 2,
              cornerRadius: 4,
              valueFormatter: (item) => formatBRL(item.value),
            },
          ]}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="caption" color="text.tertiary">
            Total
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatBRL(total)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 2 }}>
        {rows.map((row) => {
          const percentage = total > 0 ? Math.round((row.amount / total) * 100) : 0
          return (
            <Box key={row.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flex: '0 0 auto' }} />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                {row.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatBRL(row.amount)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, width: 40, textAlign: 'right' }}>
                {percentage}%
              </Typography>
            </Box>
          )
        })}
      </Box>
    </ChartCard>
  )
}
