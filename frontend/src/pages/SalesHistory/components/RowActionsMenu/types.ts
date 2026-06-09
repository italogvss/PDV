import type { SaleRecord } from '../../types'

export interface RowActionsMenuProps {
  sale: SaleRecord
  canCancel: boolean
  onViewDetails: (id: string) => void
  onCancel: (id: string) => void
}
