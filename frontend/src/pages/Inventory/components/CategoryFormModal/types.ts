import type { ProductCategory } from '../../../../types/product.types'

export interface CategoryFormModalProps {
  open: boolean
  onClose: () => void
  category?: ProductCategory
}
