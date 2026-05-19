import type { Product } from '../../../../types/product.types'

export interface ProductRowMenuProps {
  product: Product
  onEdit: (product: Product) => void
}
