import type { Product } from '../../types'

export interface ProductRowMenuProps {
  product: Product
  onEdit: (product: Product) => void
}
