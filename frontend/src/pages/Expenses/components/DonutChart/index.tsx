import { Box, Typography } from '@mui/material'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { formatBRL } from '../../../../utils/currency'
import type { DonutChartProps } from './types'

ChartJS.register(ArcElement, Tooltip)

export default function DonutChart({ segments, size = 180 }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const chartData = {
    labels: segments.map((s) => s.label),
    datasets: [
      {
        data: segments.map((s) => s.value),
        backgroundColor: segments.map((s) => s.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  const options = {
    cutout: '56%',
    rotation: -90,
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    animation: { duration: 400 },
  } as const

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Box sx={{ width: size, height: size }}>
          <Doughnut data={chartData} options={options} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100)
          return (
            <Box key={seg.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {seg.label}
              </Typography>
              <Typography variant="caption" color="text.tertiary" sx={{ width: 30, textAlign: 'right' }}>
                {pct}%
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 88, textAlign: 'right' }}>
                {formatBRL(seg.value)}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
