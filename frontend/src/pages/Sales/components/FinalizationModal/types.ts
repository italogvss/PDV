import type { CreateSalePayload, SaleDetail } from '../../../../types/sale.types'
import type { CustomerSelection } from '../../types'
import type { EnrichedCartLine } from '../CartPanel/types'

/** O que a modal decide sobre a venda — o restante do payload (itens) a página monta. */
export type FinalizationResult = Pick<
  CreateSalePayload,
  'customerId' | 'customerDocument' | 'paymentMethod' | 'isInstallment' | 'installmentCount'
  | 'amountPaid' | 'discount' | 'credit'
>

export interface FinalizationModalProps {
  open: boolean
  onClose: () => void
  lines: EnrichedCartLine[]
  subtotal: number
  customer: CustomerSelection
  onCustomerChange: (customer: CustomerSelection) => void
  /** Abre o SelectCustomerModal, que a página mantém montado (evita Dialog aninhado). */
  onOpenCustomerModal: () => void
  onFinalize: (result: FinalizationResult) => Promise<SaleDetail | undefined>
  isSubmitting: boolean
  /** Fecha a modal e limpa o carrinho para a próxima venda. */
  onNewSale: () => void
}
