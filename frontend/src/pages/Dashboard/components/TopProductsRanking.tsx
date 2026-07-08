import { Typography } from '@mui/material'
import RankingList from '../../../components/RankingList'
import { formatBRL } from '../../../utils/currency'
import type { TopProduct } from '../../../types/report.types'

export interface TopProductsRankingProps {
  products: TopProduct[]
  loading?: boolean
}

export default function TopProductsRanking({ products, loading = false }: TopProductsRankingProps) {
  const items = products.map((p) => ({
    id: p.productName,
    label: p.productName,
    value: p.quantity,
    primaryText: formatBRL(p.revenue),
    secondaryText: `${p.quantity}×`,
  }))

  return (
    <RankingList
      title="Produtos mais vendidos"
      action={
        <Typography variant="caption" color="text.tertiary">
          Este mês
        </Typography>
      }
      items={items}
      loading={loading}
      emptyText="Nenhuma venda neste mês."
    />
  )
}
