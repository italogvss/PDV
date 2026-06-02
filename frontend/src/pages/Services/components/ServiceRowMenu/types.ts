import type { Service } from '../../../../types/service.types'

export interface ServiceRowMenuProps {
  service: Service
  onEdit: (service: Service) => void
  onDelete: (id: string) => void
}
