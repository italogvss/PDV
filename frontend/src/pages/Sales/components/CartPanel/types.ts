import type { Product } from '../../../../types/product.types'
import type { Service } from '../../../../types/service.types'

export type EnrichedCartLine =
  | { type: 'product'; productId: string; quantity: number; product: Product }
  | { type: 'service'; lineId: string; serviceId: string; quantity: number; service: Service }

// O painel só monta o carrinho. Desconto, forma de pagamento, parcelas e crediário são
// decisões da venda e vivem na modal de finalização.
export interface CartPanelProps {
  lines: EnrichedCartLine[]
  subtotal: number
  onRestart: () => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (id: string) => void
  onFinalize: () => void
}
