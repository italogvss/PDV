import type { Product } from '../../../../types/product.types'

export interface AdjustStockModalProps {
  open: boolean
  onClose: () => void
  product: Product
}
