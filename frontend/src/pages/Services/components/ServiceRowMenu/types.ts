import type { Service } from '../../../../types/service.types'

export interface ServiceRowMenuProps {
  service: Service
  canManage: boolean
  onEdit: (service: Service) => void
  onDelete: (id: string) => void
}
