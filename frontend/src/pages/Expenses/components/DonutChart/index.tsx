import { Box, Typography } from '@mui/material'
import { PieChart } from '@mui/x-charts'
import { formatBRL } from '../../../../utils/currency'
import type { DonutChartProps } from './types'

export default function DonutChart({ segments, size = 180 }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const data = segments.map((seg) => ({
    id: seg.label,
    label: seg.label,
    value: seg.value,
    color: seg.color,
  }))

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <PieChart
          width={size}
          height={size}
          series={[
            {
              data,
              innerRadius: size * 0.28,
              outerRadius: size * 0.48,
              paddingAngle: 2,
              cornerRadius: 3,
              startAngle: -90,
              valueFormatter: (item) => formatBRL(item.value),
            },
          ]}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
          slotProps={{ legend: { sx: { display: 'none' } } }}
        />
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
