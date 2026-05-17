import { Card, CardContent, Box, Typography, useTheme } from '@mui/material'
import { PaymentMethod } from '../../../types/dashboard.types'
import { formatBRL } from '../../../utils/currency'

interface PaymentMethodsChartProps {
  methods: PaymentMethod[]
}

export default function PaymentMethodsChart({ methods }: PaymentMethodsChartProps) {
  const theme = useTheme()

  const radius = 50
  const centerX = 80
  const centerY = 80

  let currentAngle = -90
  const slices = methods.map((method) => {
    const sliceAngle = (method.percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)

    const largeArc = sliceAngle > 180 ? 1 : 0

    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    currentAngle = endAngle

    return { ...method, path }
  })

  const totalAmount = methods.reduce((sum, m) => sum + m.amount, 0)

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
          Formas de pagamento
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          {/* Pie Chart */}
          <Box sx={{ flex: '0 0 auto' }}>
            <svg width={160} height={160} viewBox="0 0 160 160">
              {slices.map((slice) => (
                <path key={slice.id} d={slice.path} fill={slice.color} />
              ))}
              {/* Center circle for donut effect */}
              <circle cx={centerX} cy={centerY} r={35} fill={theme.palette.background.paper} />
              {/* Center text */}
              <text
                x={centerX}
                y={centerY - 5}
                textAnchor="middle"
                fontSize={16}
                fontWeight="bold"
                fill={theme.palette.text.primary}
              >
                {formatBRL(totalAmount)}
              </text>
            </svg>
          </Box>

          {/* Legend */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {methods.map((method) => (
              <Box key={method.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    backgroundColor: method.color,
                    borderRadius: '50%',
                    flex: '0 0 auto',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {method.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 500, color: 'text.primary', display: 'block' }}
                  >
                    {formatBRL(method.amount)} • {method.percentage}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
