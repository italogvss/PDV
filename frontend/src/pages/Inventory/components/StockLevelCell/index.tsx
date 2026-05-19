import { Box, LinearProgress, Chip } from '@mui/material'
import { getStockLevel, getStockPercent } from '../../utils'
import type { StockLevelCellProps } from './types'
import type { StockLevel } from '../../../../types/product.types'

type ChipColor = 'default' | 'warning' | 'error'

const chipColorMap: Record<StockLevel, ChipColor> = {
  OK: 'default',
  Baixo: 'warning',
  Crítico: 'error',
}

const barColorToken: Record<StockLevel, string> = {
  OK: 'success.main',
  Baixo: 'warning.main',
  Crítico: 'error.main',
}

export default function StockLevelCell({
  stock,
  minStock,
  criticalStock,
}: StockLevelCellProps) {
  const level = getStockLevel(stock, minStock, criticalStock)
  const percent = minStock ? getStockPercent(stock, minStock) : 100

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          width: 80,
          flexShrink: 0,
          '& .MuiLinearProgress-bar': { bgcolor: barColorToken[level] },
        }}
      />
      <Chip
        size="small"
        color={chipColorMap[level]}
        label={level}
      />
    </Box>
  )
}
