import { Card, CardContent, Box, Typography, useTheme } from '@mui/material'
import { DailyRevenueData } from '../../../types/report.types'

interface RevenueVsExpenseChartProps {
  data: DailyRevenueData[]
}

export default function RevenueVsExpenseChart({ data }: RevenueVsExpenseChartProps) {
  const theme = useTheme()

  const maxRevenue = Math.max(...data.map((d) => d.revenue))
  const chartHeight = 200
  const chartWidth = 600
  const barWidth = chartWidth / (data.length * 2.5)
  const barGap = barWidth * 0.8


  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Receita vs. Lucro
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: 'success.main',
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Receita
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: 'text.tertiary',
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Lucro
              </Typography>
            </Box>
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

            {/* Bars */}
            {data.map((item, idx) => {
              const revenueHeight = (item.revenue / maxRevenue) * chartHeight
              const profitHeight = (item.profit / maxRevenue) * chartHeight
              const x = idx * (barWidth * 2 + barGap)

              return (
                <g key={item.date}>
                  {/* Revenue bar */}
                  <rect
                    x={x}
                    y={chartHeight - revenueHeight}
                    width={barWidth}
                    height={revenueHeight}
                    fill={theme.palette.success.main}
                    rx={2}
                  />
                  {/* Profit bar */}
                  <rect
                    x={x + barWidth + barGap / 2}
                    y={chartHeight - profitHeight}
                    width={barWidth}
                    height={profitHeight}
                    fill={theme.palette.text.tertiary}
                    rx={2}
                  />
                </g>
              )
            })}

            {/* X-axis labels */}
            {data.map((item, idx) => {
              const x = idx * (barWidth * 2 + barGap) + barWidth
              return (
                <text
                  key={`label-${item.date}`}
                  x={x}
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
