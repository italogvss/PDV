import type { ServiceCategory } from '../../../../types/service.types'

export interface CategoryFormModalProps {
  open: boolean
  onClose: () => void
  category?: ServiceCategory
}
