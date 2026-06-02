import type { Supplier } from '../../../../types/supplier.types'

export interface SupplierFormModalProps {
  open: boolean
  supplier?: Supplier | null
  onClose: () => void
}
