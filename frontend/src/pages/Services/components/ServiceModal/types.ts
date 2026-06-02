import type { Service } from '../../../../types/service.types'

export interface ServiceModalProps {
  open: boolean
  onClose: () => void
  service?: Service
}
