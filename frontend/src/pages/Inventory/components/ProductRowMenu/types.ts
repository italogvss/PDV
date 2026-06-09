import type { Product } from '../../../../types/product.types'

export interface ProductRowMenuProps {
  product: Product
  canManage: boolean
  onEdit: (product: Product) => void
  onAdjustStock: (product: Product) => void
  onDelete: (id: string) => void
}
