import { Box, Typography } from '@mui/material'
import { formatBRL } from '../../../../utils/currency'
import type { DonutChartProps } from './types'

export default function DonutChart({ segments, size = 180, thickness = 28 }: DonutChartProps) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const GAP = 2
  let cumulativeLength = circumference / 4 // start at top

  const arcs = segments.map((seg) => {
    const rawLength = (seg.value / total) * circumference
    const dashLength = Math.max(0, rawLength - GAP)
    const dashOffset = -(cumulativeLength + GAP / 2)
    cumulativeLength += rawLength
    return { ...seg, dashLength, dashOffset }
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={`${arc.dashLength} ${circumference}`}
              strokeDashoffset={arc.dashOffset}
            />
          ))}
        </svg>
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
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, minWidth: 88, textAlign: 'right' }}
              >
                {formatBRL(seg.value)}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
