import { Product } from '../../types'

export interface ProductCardProps {
  product: Product
  onAdd: (productId: string) => void
}
