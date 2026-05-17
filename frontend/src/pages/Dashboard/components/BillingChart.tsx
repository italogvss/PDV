import { Card, CardContent, Box, Typography, useTheme } from '@mui/material'
import { DailyBillingData } from '../../../types/dashboard.types'

interface BillingChartProps {
  data: DailyBillingData[]
}

export default function BillingChart({ data }: BillingChartProps) {
  const theme = useTheme()

  const maxAmount = Math.max(...data.map((d) => d.amount))
  const chartHeight = 200
  const chartWidth = 600
  const padding = 40

  // Create smooth curve path
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * (chartWidth - padding)
    const y = chartHeight - (item.amount / maxAmount) * (chartHeight - padding)
    return { x, y, amount: item.amount }
  })

  // Generate path using quadratic curves
  let pathData = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1]
    const currPoint = points[i]
    const controlX = (prevPoint.x + currPoint.x) / 2
    pathData += ` Q ${controlX} ${prevPoint.y}, ${currPoint.x} ${currPoint.y}`
  }

  // Close path for fill
  const fillPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Faturamento
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Últimas 14 dias • R$ 34.530,00
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto', pb: 2 }}>
          <svg width="100%" height={250} viewBox={`0 0 ${chartWidth} ${chartHeight + 50}`}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`grid-${i}`}
                x1="0"
                y1={chartHeight - (chartHeight / 4) * i}
                x2={chartWidth}
                y2={chartHeight - (chartHeight / 4) * i}
                stroke={theme.palette.border.subtle}
                strokeWidth={1}
              />
            ))}

            {/* Filled area */}
            <path d={fillPath} fill={theme.palette.success.main} opacity={0.15} />

            {/* Line */}
            <path d={pathData} fill="none" stroke={theme.palette.success.main} strokeWidth={2} />

            {/* X-axis labels */}
            {data.map((item, idx) => {
              if (idx % 3 !== 0 && idx !== data.length - 1) return null
              const point = points[idx]
              return (
                <text
                  key={`label-${item.date}`}
                  x={point.x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill={theme.palette.text.tertiary}
                >
                  {item.date}
                </text>
              )
            })}
          </svg>
        </Box>
      </CardContent>
    </Card>
  )
}
