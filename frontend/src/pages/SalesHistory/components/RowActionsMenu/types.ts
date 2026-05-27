import type { SaleRecord } from '../../types'

export interface RowActionsMenuProps {
  sale: SaleRecord
  onViewDetails: (id: string) => void
  onCancel: (id: string) => void
}
