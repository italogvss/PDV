import type { Product } from '../../../../types/product.types'

export interface ProductCardProps {
  product: Product
  onAdd: (productId: string) => void
}
