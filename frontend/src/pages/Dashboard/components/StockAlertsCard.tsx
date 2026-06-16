import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import { Avatar, Box, Chip, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../../../hooks/useProducts'
import type { Product } from '../../../types/product.types'
import QuickActionCard from './QuickActionCard'

type Severity = 'critical' | 'low'

interface AlertItem {
  product: Product
  severity: Severity
}

function classify(p: Product): Severity | null {
  if (p.stock <= 0) return null
  if (p.criticalStock !== undefined && p.stock <= p.criticalStock) return 'critical'
  if (
    p.minStock !== undefined &&
    p.stock <= p.minStock &&
    (p.criticalStock === undefined || p.stock > p.criticalStock)
  )
    return 'low'
  return null
}

export default function StockAlertsCard() {
  const navigate = useNavigate()
  const { data: products, isLoading } = useProducts()

  const alerts: AlertItem[] = (products ?? [])
    .map((product) => {
      const severity = classify(product)
      return severity ? { product, severity } : null
    })
    .filter((item): item is AlertItem => item !== null)
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
      return a.product.stock - b.product.stock
    })

  return (
    <QuickActionCard
      title="Alertas de estoque"
      badge={alerts.length > 0 ? { label: `${alerts.length} itens`, color: 'warning' } : undefined}
      footerLabel="Gerenciar estoque"
      onFooter={() => navigate('/estoque')}
      loading={isLoading}
      isEmpty={alerts.length === 0}
      emptyText="Estoque saudável."
    >
      {alerts.slice(0, 3).map(({ product, severity }) => (
        <Box key={product.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={product.imageUrl}
            variant="rounded"
            sx={{ width: 36, height: 36, bgcolor: 'surface.raised', color: 'text.tertiary' }}
          >
            <Inventory2Outlined sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {product.name}
            </Typography>
            {product.barcode && (
              <Typography variant="caption" color="text.tertiary" noWrap>
                {product.barcode}
              </Typography>
            )}
          </Box>
          <Chip
            size="small"
            color={severity === 'critical' ? 'error' : 'warning'}
            label={`${product.stock} un.`}
          />
        </Box>
      ))}
    </QuickActionCard>
  )
}
