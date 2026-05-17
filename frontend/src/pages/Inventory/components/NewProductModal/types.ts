import type { Product } from '../../types'

export interface ProductModalProps {
  open: boolean
  onClose: () => void
  product?: Product
}
