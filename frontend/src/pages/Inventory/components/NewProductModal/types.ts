import type { Product } from '../../../../types/product.types'

export interface ProductModalProps {
  open: boolean
  onClose: () => void
  product?: Product
}
