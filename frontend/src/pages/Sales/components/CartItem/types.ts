import { Product } from '../../types'

export interface CartItemProps {
  product: Product
  quantity: number
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
}
