import { Box, Card, CardContent, Divider, Skeleton, Typography } from '@mui/material'
import InfoTooltip from '../InfoTooltip'
import type { RankingListProps } from './types'

export default function RankingList({
  title,
  subtitle,
  info,
  action,
  items,
  loading = false,
  emptyText = 'Nenhum dado no período selecionado.',
  maxItems = 10,
}: RankingListProps) {
  const visibleItems = items.slice(0, maxItems)
  const maxValue = visibleItems.reduce((max, item) => Math.max(max, item.value), 0)

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {info && <InfoTooltip title={info} />}
            </Box>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      </CardContent>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
          </Box>
        ) : visibleItems.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleItems.map((item, idx) => (
              <Box key={item.id}>
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
                    {item.label}
                  </Typography>
                  {item.secondaryText && (
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {item.secondaryText}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                    {item.primaryText}
                  </Typography>
                </Box>
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden', ml: 4.5 }}>
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: 'success.main',
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">{emptyText}</Typography>
        )}
      </Box>
    </Card>
  )
}
