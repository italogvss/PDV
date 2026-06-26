import type { Product } from '../../../../types/product.types'
import type { Service } from '../../../../types/service.types'

export type EnrichedCartLine =
  | { type: 'product'; productId: string; quantity: number; product: Product }
  | { type: 'service'; lineId: string; serviceId: string; quantity: number; service: Service }

export interface CartPanelProps {
  lines: EnrichedCartLine[]
  subtotal: number
  total: number
  onRestart: () => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (id: string) => void
  onFinalize: () => void
}
