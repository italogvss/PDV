import { Box, Typography } from '@mui/material'
import { PieChart } from '@mui/x-charts/PieChart'
import ChartCard from '../ChartCard'
import { formatBRL } from '../../utils/currency'
import type { DonutChartProps } from './types'

export default function DonutChart({
  title,
  subtitle,
  info,
  action,
  segments,
  loading = false,
  emptyText = 'Sem dados no período selecionado.',
  size = 200,
  showTotal = false,
  totalLabel = 'Total',
  valueFormatter = formatBRL,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const pieData = segments
    .filter((s) => s.value > 0)
    .map((s) => ({ id: s.label, label: s.label, value: s.value, color: s.color }))

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      info={info}
      action={action}
      loading={loading}
      isEmpty={total <= 0}
      emptyText={emptyText}
    >
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 3 }}>
        <PieChart
          width={size}
          height={size}
          hideLegend
          series={[
            {
              data: pieData,
              innerRadius: size * 0.32,
              outerRadius: size * 0.48,
              paddingAngle: 2,
              cornerRadius: 4,
              startAngle: -90,
              valueFormatter: (item) => valueFormatter(item.value),
            },
          ]}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        />
        {showTotal && (
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
              {totalLabel}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {valueFormatter(total)}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0
          return (
            <Box key={seg.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: seg.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {seg.label}
              </Typography>
              <Typography variant="caption" color="text.tertiary" sx={{ width: 34, textAlign: 'right' }}>
                {pct}%
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 88, textAlign: 'right' }}>
                {valueFormatter(seg.value)}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </ChartCard>
  )
}
